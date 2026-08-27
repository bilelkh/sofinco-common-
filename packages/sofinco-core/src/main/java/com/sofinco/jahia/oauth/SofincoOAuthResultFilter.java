package com.sofinco.jahia.oauth;

import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.jahia.services.render.filter.AbstractFilter;
import org.jahia.services.render.filter.RenderChain;
import org.jahia.services.render.filter.RenderFilter;
import org.json.JSONObject;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.RepositoryException;
import javax.servlet.http.HttpSession;

/**
 * Rewrites the render output of jahia-oauth's {@code joant:oauthResult} node so the SSO login can be
 * finalized in a <em>seamless</em> (no-popup) flow as well as the login-button popup flow.
 * <p>
 * <b>Why a RenderFilter and not a view override.</b> The {@code oauth-result} page is auto-created at the
 * site root by jahia-oauth (a {@code jnt:pageTemplate} whose {@code pagecontent} holds an
 * {@code authentication-result} of type {@code joant:oauthResult}). Overriding that node's view from
 * another module (sofinco-core or even template-set) proved unreliable — jahia-oauth's own
 * {@code joant_oauthResult/html/oauthResult.jsp} kept winning (cross-module view precedence / render
 * scope). A {@link RenderFilter} is a global OSGi service keyed by node type: it runs regardless of which
 * module owns the view, so it is the robust integration point.
 * <p>
 * jahia-oauth's original view emits only {@code window.opener.postMessage(...)}, which throws on a
 * top-level navigation (no opener) — the symptom being a page stuck on {@code oauth-result.html}. This
 * filter replaces that fragment with a script that branches CLIENT-SIDE:
 * <ul>
 *   <li>{@code window.opener} present → {@code postMessage} the opener (login-button flow, unchanged);</li>
 *   <li>no opener → navigate to the originally-requested URL (stashed in the session by
 *       {@link SofincoConnectRedirectAction}, falling back to the site home) with {@code ?site=<siteKey>},
 *       which {@code SSOValve} (jahia-authentication) consumes to perform the actual Jahia login.</li>
 * </ul>
 * The popup/no-popup branch is decided in the browser. The per-session return URL is safe to bake in here
 * even though the visitor is still a guest: this filter's priority (15) is <em>below</em> the active
 * {@code CacheFilter} (16.5), so its {@code execute} runs fresh on <em>every</em> request (it transforms
 * whatever the cache returned) — the returnUrl is never captured into a shared cached fragment. The
 * return URL was already same-origin-validated ({@link SofincoConnectRedirectAction#isSafeReturnUrl}).
 */
@Component(service = RenderFilter.class, immediate = true)
public class SofincoOAuthResultFilter extends AbstractFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(SofincoOAuthResultFilter.class);

    @Activate
    public void activate() {
        setPriority(15f);
        setApplyOnNodeTypes("joant:oauthResult");
        setApplyOnModes("live");
        setDescription("Rewrites jahia-oauth's oauth-result page so a no-popup (seamless) SSO login finalizes itself.");
    }

    @Override
    public String execute(String previousOut, RenderContext renderContext, Resource resource, RenderChain chain)
            throws Exception {
        boolean isAuthenticate = "true".equals(renderContext.getRequest().getParameter("isAuthenticate"));
        String site = JSONObject.quote(renderContext.getSite().getSiteKey());
        String target = JSONObject.quote(resolveReturnUrl(renderContext));

        // The popup and its opener (the login-button page) are same-origin — the popup returned to
        // oauth-result on the Sofinco domain. So target window.location.origin instead of '*' (defense in
        // depth + silences the Sonar/Snyk broadcast-postMessage rule; the payload carries no secret). The
        // try/catch swallows a COOP-sealed opener.
        String script = "(function(){var hasOpener=window.opener&&window.opener!==window;"
                + "if(hasOpener){try{window.opener.postMessage({authenticationIsDone:true,isAuthenticate:" + isAuthenticate
                + "},window.location.origin);}catch(e){}return;}"
                + (isAuthenticate
                        ? "var target=" + target + ",site=" + site
                                + ";var sep=target.indexOf('?')===-1?'?':'&';"
                                + "window.location.replace(target+sep+'site='+encodeURIComponent(site));"
                        : "")
                + "})();";

        // i18n: FR-only on purpose. The SSO flow is mono-locale French (loginUrl defaults to
        // /cms/render/live/fr/sites/sofinco/home...), and the success message shows for milliseconds before
        // the script's window.location.replace fires. If an EN site is ever added, externalize via Jahia's
        // Messages/JahiaResourceBundle (NOT raw ResourceBundle.getBundle - the render-thread TCCL is not this
        // bundle's classloader) with keys in resources/sofinco-core.properties and a FR fallback.
        String message = isAuthenticate
                ? "Authentification réussie, redirection en cours…"
                : "Échec de l'authentification.";

        return "<div class=\"oauth-result-header\"><p>" + message + "</p></div><script>" + script + "</script>";
    }

    /**
     * The seamless-flow return URL stashed by {@link SofincoConnectRedirectAction}, or the site home URL
     * as a fallback (login button / no stash). Read straight from the live HTTP session — this runs on
     * every request (filter is outside the cache), so the value is always the current visitor's.
     */
    private static String resolveReturnUrl(RenderContext renderContext) throws RepositoryException {
        HttpSession session = renderContext.getRequest().getSession();
        Object stored = session.getAttribute(SofincoConnectRedirectAction.RETURN_URL_SESSION_ATTR);
        if (stored instanceof String returnUrl && !returnUrl.isEmpty()) {
            // One-shot handoff: consume it so a later login that doesn't re-stash (e.g. the popup flow, or
            // a reload) can't be served this stale URL. After this read the value is never needed again -
            // the client navigates immediately.
            session.removeAttribute(SofincoConnectRedirectAction.RETURN_URL_SESSION_ATTR);
            LOGGER.debug("Sofinco SSO: oauth-result consumed stashed return URL '{}' (session {})",
                    returnUrl, session.getId());
            return returnUrl;
        }
        String home = renderContext.getSite().getHome().getUrl();
        LOGGER.debug("Sofinco SSO: oauth-result found no stashed return URL (session {}); falling back to home '{}'",
                session.getId(), home);
        return home;
    }
}
