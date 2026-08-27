package com.sofinco.jahia.oauth;

import org.apache.commons.lang3.StringUtils;
import org.jahia.bin.Action;
import org.jahia.bin.ActionResult;
import org.jahia.modules.jahiaauth.service.SettingsService;
import org.jahia.modules.jahiaoauth.service.JahiaOAuthService;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.jahia.services.render.URLResolver;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.RepositoryException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.Map;

/**
 * Full-page, server-side redirect entry point into the Sofinco SSO flow — the sibling of jahia-oauth's
 * popup/XHR {@code connectToSofincoAction}. Used by {@link SofincoLoginUrlProvider} so a 401 bounces the
 * top-level browser straight to the IdP (no popup, no JavaScript required to start).
 * <p>
 * <b>Why a custom action.</b> jahia-oauth's {@code ConnectToOAuthProvider} always returns
 * {@code {"authorizationUrl":…}} as JSON (HTTP 200) — a popup/XHR API, never a redirect. This action
 * asks the same {@link JahiaOAuthService#getAuthorizationUrl} for the IdP authorize URL but returns it as
 * an {@link ActionResult} that {@code Render} emits via {@code response.sendRedirect(...)}
 * ({@code resultCode < 300} + {@code absoluteUrl == true}; a top-level {@code Accept: text/html} nav is
 * not treated as JSON, so a real 302 is issued to the external IdP).
 * <p>
 * <b>How login is finalized.</b> jahia-oauth's callback ({@code sofincoOAuthCallbackAction}, unchanged)
 * stores the mapped user under the current session id and redirects to {@code …/oauth-result.html}.
 * {@link SofincoOAuthResultFilter} rewrites that page so, with no popup opener, it navigates to the
 * originally-requested URL (stashed here in the session, falling back to the site home) with
 * {@code ?site=<siteKey>}, which {@code SSOValve} (jahia-authentication) consumes to perform the actual
 * Jahia login — the same terminal step the login button does.
 * <p>
 * The naming contract: {@link #CONNECTOR_NAME} must stay byte-identical with {@code SofincoApi} (see
 * {@code SofincoConnectorImpl} / {@code SofincoApiRegistrar}). {@link #ACTION_NAME} is authored here and
 * referenced by {@code SofincoLoginUrlProvider}'s default {@code loginUrl}.
 */
@Component(service = Action.class, immediate = true)
public class SofincoConnectRedirectAction extends Action {

    private static final Logger LOGGER = LoggerFactory.getLogger(SofincoConnectRedirectAction.class);

    /** The {@code .do} segment: {@code <home>.connectToSofincoRedirectAction.do}. */
    static final String ACTION_NAME = "connectToSofincoRedirectAction";
    /** jahia-oauth connector service name — the naming contract shared across the connector. */
    static final String CONNECTOR_NAME = "SofincoApi";
    /**
     * Request param carrying the originally-requested URL, appended by {@link SofincoLoginUrlProvider}
     * (sourced from the {@code javax.servlet.error.request_uri} attribute of the 401 error dispatch —
     * Jahia's own {@code ErrorServlet} {@code redirect} param is only present when a {@code urlResolver}
     * is on the request, which is not always the case).
     */
    static final String RETURN_URL_PARAM = "returnUrl";
    /** Session attribute the validated return URL is stashed under; read back by {@link SofincoOAuthResultFilter}. */
    static final String RETURN_URL_SESSION_ATTR = "sofincoSsoReturnUrl";

    private JahiaOAuthService jahiaOAuthService;
    private SettingsService settingsService;

    @Activate
    public void activate() {
        setName(ACTION_NAME);
        setRequireAuthenticatedUser(false);
        setRequiredMethods("GET");
    }

    @Override
    public ActionResult doExecute(HttpServletRequest req, RenderContext renderContext, Resource resource,
            JCRSessionWrapper session, Map<String, List<String>> parameters, URLResolver urlResolver) throws Exception {
        String siteKey = renderContext.getSite().getSiteKey();
        var config = settingsService.getConnectorConfig(siteKey, CONNECTOR_NAME);
        if (config == null) {
            // Do NOT return ActionResult.INTERNAL_ERROR here: a 500 sends Render into Jahia's ErrorPageHandler,
            // which NPEs on a .do URL (siteByKey null) and masks THIS root cause. Fail gracefully to a public
            // page and log loudly instead — ops sees the real reason, the user is never stuck on an opaque 500.
            LOGGER.error("No connector config for '{}' on site '{}' — SSO not configured; redirecting to site home",
                    CONNECTOR_NAME, siteKey);
            return redirectToSiteHome(renderContext);
        }

        // Stash the post-login destination in the (flow-stable) HTTP session; SofincoOAuthResultFilter
        // reads it back to redirect the user to the page that 401'd. Only stored when same-origin-safe.
        String returnUrl = getParameter(parameters, RETURN_URL_PARAM);
        if (isSafeReturnUrl(returnUrl)) {
            req.getSession().setAttribute(RETURN_URL_SESSION_ATTR, returnUrl);
            LOGGER.debug("Sofinco SSO: stashed return URL '{}' (session {})", returnUrl, req.getSession().getId());
        } else {
            LOGGER.debug("Sofinco SSO: no usable return URL (param '{}' = '{}'); will fall back to site home",
                    RETURN_URL_PARAM, returnUrl);
        }

        // state == sessionId: jahia-oauth keys the callback's mapper results by this exact value.
        String authorizationUrl = jahiaOAuthService.getAuthorizationUrl(config, req.getSession().getId(), null);
        if (StringUtils.isBlank(authorizationUrl)) {
            // Same rationale as the null-config branch: never hand Render an error status (→ ErrorPageHandler NPE).
            LOGGER.error("Empty authorization URL from jahia-oauth for '{}' on site '{}' — redirecting to site home",
                    CONNECTOR_NAME, siteKey);
            return redirectToSiteHome(renderContext);
        }

        // ActionResult(code<300, url, absoluteUrl=true, json=null) => Render does resp.sendRedirect(url),
        // i.e. a real 302 to the external IdP authorize URL.
        return new ActionResult(HttpServletResponse.SC_OK, authorizationUrl, true, null);
    }

    /**
     * Graceful fallback when SSO cannot be started (no connector config / empty authorize URL). Returns a
     * redirect (resultCode &lt; 300) to the site home so {@code Render} does a plain {@code sendRedirect}
     * rather than emitting a 500 — a 500 would route into Jahia's {@code ErrorPageHandler}, which NPEs on a
     * {@code .do} URL ({@code siteByKey} null) and hides the real cause logged just above. Site-relative
     * ({@code absoluteUrl=false}); falls back to the context root if the home node can't be resolved.
     */
    private static ActionResult redirectToSiteHome(RenderContext renderContext) {
        var homeUrl = "/";
        try {
            String base = renderContext.getURLGenerator().getBase(); // e.g. /cms/render/live/fr
            String homePath = renderContext.getSite().getHome().getPath();
            if (StringUtils.isNotBlank(base) && StringUtils.isNotBlank(homePath)) {
                homeUrl = base + homePath + ".html";
            }
        } catch (RepositoryException | RuntimeException e) {
            LOGGER.debug("Could not build site-home URL for SSO fallback; using context root", e);
        }
        return new ActionResult(HttpServletResponse.SC_OK, homeUrl, false, null);
    }

    /**
     * Same-origin / anti-injection guard for the contributor-supplied return URL. Accepts only a single
     * leading {@code /} not followed by another {@code /} (rejects {@code //evil.com} and
     * {@code https://evil.com}) and no whitespace/quotes/angle-brackets/backslash (the value is later
     * used as a redirect target and inlined into a JS string in {@link SofincoOAuthResultFilter} — this
     * blocks an open-redirect and a reflected-XSS breakout). Mirrors template-set's {@code safeRedirectUrl}.
     * <p>
     * <b>Note on {@code /\evil.com}:</b> the {@code (?!/)} lookahead only guards against a second
     * {@code /}, but the backslash is already excluded <em>everywhere</em> in the body by the character
     * class {@code [^\s'"<>\\]} — so a {@code /\...} path (which browsers normalize to {@code //...})
     * fails the full-string match and is rejected. The backslash guard lives in the char class, not the
     * lookahead; do not "add {@code \\} to the lookahead" thinking it closes a hole — it is already closed.
     */
    static boolean isSafeReturnUrl(String raw) {
        return raw != null && raw.matches("/(?!/)[^\\s'\"<>\\\\]*");
    }

    @Reference
    public void setJahiaOAuthService(JahiaOAuthService jahiaOAuthService) {
        this.jahiaOAuthService = jahiaOAuthService;
    }

    @Reference
    public void setSettingsService(SettingsService settingsService) {
        this.settingsService = settingsService;
    }
}
