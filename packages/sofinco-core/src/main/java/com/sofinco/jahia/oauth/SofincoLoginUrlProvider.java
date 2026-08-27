package com.sofinco.jahia.oauth;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import javax.servlet.http.HttpServletRequest;

import org.apache.commons.lang3.StringUtils;
import org.jahia.modules.jahiaauth.service.ConnectorConfig;
import org.jahia.modules.jahiaauth.service.SettingsService;
import org.jahia.modules.jahiaoauth.service.JahiaOAuthService;
import org.jahia.params.valves.LoginConfig;
import org.jahia.params.valves.LoginUrlProvider;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Deactivate;
import org.osgi.service.component.annotations.Modified;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.metatype.annotations.AttributeDefinition;
import org.osgi.service.metatype.annotations.Designate;
import org.osgi.service.metatype.annotations.ObjectClassDefinition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Routes unauthorized (401) accesses into the Sofinco SSO flow by advertising the jahia-oauth
 * "connect" action URL as Jahia's custom login URL.
 * <p>
 * Jahia's {@link LoginConfig} singleton keeps a list of {@link LoginUrlProvider}s and, on an
 * unauthorized access, redirects to the first one whose {@link #hasCustomLoginUrl()} is {@code true}
 * and whose {@link #getLoginUrl(HttpServletRequest)} returns a non-blank value
 * ({@code ErrorServlet#getCustomLoginUrl}, {@code URLGenerator#getLoginUrl}). We register ourselves at
 * the FRONT of that list ({@code osgiBind} does {@code addFirst}), so the Sofinco IdP becomes the
 * effective login entry point.
 * <p>
 * Registration mirrors the module's {@link SofincoApiRegistrar} idiom: this is a plain DS
 * {@code @Component} (no Spring context in this bundle), so instead of relying on
 * {@code LoginConfig}'s {@code ContextRefreshedEvent} bean-scan we bind the singleton directly in
 * {@link #activate} and unbind in {@link #deactivate}. {@code LoginConfig.osgiBind/osgiUnbind} are the
 * public hooks for exactly this.
 * <p>
 * <b>Seamless (no-popup) flow — direct-to-IdP.</b> On a 401 this provider builds the IdP authorize URL
 * itself (via {@link JahiaOAuthService#getAuthorizationUrl} with the site's {@code SofincoApi}
 * {@link ConnectorConfig}) and returns that <em>absolute external URL</em>, so Jahia's 401 handler
 * redirects the browser straight to the IdP. This deliberately does NOT route through
 * {@link SofincoConnectRedirectAction} (a Jahia render Action): an Action is invoked through the Render
 * servlet <em>on a node</em>, which enforces read ACL on that node <em>before</em> the action runs — so on
 * a site where the guest (anonymous) user is disabled, the action URL is itself unreachable to the very
 * unauthenticated user trying to log in (redirect loop → the {@code siteByKey}-null
 * {@code ErrorPageHandler} NPE). A direct IdP URL needs no anonymous render at all, and is also immune to
 * SEO vanity-URL rewriting stripping the {@code /cms/render/live/fr} prefix.
 * <p>
 * Login is finalized by {@link SofincoOAuthResultFilter}, which rewrites the {@code oauth-result} page to
 * navigate to the originally-requested URL with {@code ?site=} once the IdP round-trip completes. That URL
 * is stashed in the session here (same attribute the action used), sourced from the
 * {@code javax.servlet.error.request_uri} error-dispatch attribute — NOT {@code getRequestURI()}, which is
 * {@code /error} inside the dispatch, and NOT Jahia's own {@code redirect} param, which is only present
 * when a {@code urlResolver} happens to be on the request.
 * <p>
 * <b>Fallback.</b> If the connector config or the OAuth services are unavailable (so no direct URL can be
 * built), this degrades to the configured render-action {@link #loginUrl} (default
 * {@code .connectToSofincoRedirectAction.do}) with {@code ?returnUrl=…} appended — the previous behaviour.
 * That URL is only a config default here (overridable via Config Admin), so this class is not a second hard
 * authoring site for {@link SofincoConnectRedirectAction#ACTION_NAME}.
 */
@Component(immediate = true, configurationPid = "com.sofinco.jahia.oauth.loginurl")
@Designate(ocd = SofincoLoginUrlProvider.Config.class)
public class SofincoLoginUrlProvider implements LoginUrlProvider {

    private static final Logger LOGGER = LoggerFactory.getLogger(SofincoLoginUrlProvider.class);

    /**
     * DS Component Property Type (PID {@code com.sofinco.jahia.oauth.loginurl}, shipped default:
     * {@code META-INF/configurations/com.sofinco.jahia.oauth.loginurl.cfg}). bnd reads the method defaults
     * at build time; the OSGi Metatype annotations ({@link ObjectClassDefinition}/{@link Designate}) make
     * the PID discoverable and typed in the OSGi config console (CLASS retention → build-time only).
     */
    @ObjectClassDefinition(name = "Sofinco OAuth — 401 Login URL",
            description = "Routes unauthorized (401) accesses into the Sofinco SSO flow by advertising the "
                    + "connect-redirect action as Jahia's custom login URL (seamless, no-popup).")
    @interface Config {
        /** Master switch: when {@code false}, 401s fall back to Jahia's default login (this provider stays inert). */
        @AttributeDefinition(name = "Enabled",
                description = "Master switch. When false, 401s fall back to Jahia's default login and this "
                        + "provider stays inert.")
        boolean enabled() default true;

        /**
         * Site-relative URL the user is redirected to on a 401. Defaults to the live redirect-connect
         * action on the Sofinco site home. The originally-requested URL is appended as {@code returnUrl}.
         * Change per environment (workspace/language/site) via Config Admin.
         */
        @AttributeDefinition(name = "Login URL",
                description = "FALLBACK only: site-relative render-action URL used on a 401 when the direct IdP "
                        + "authorize URL cannot be built (connector config or OAuth services unavailable). NOT "
                        + "jahia-oauth's JSON popup action. The originally-requested URL is appended as returnUrl. "
                        + "Change per environment (workspace/language/site).")
        String loginUrl() default "/cms/render/live/fr/sites/sofinco/home.connectToSofincoRedirectAction.do";

        /**
         * Site key whose {@code SofincoApi} connector config is read to build the direct IdP authorize URL.
         * The 401 error dispatch has no resolved {@code RenderContext}, so the site can't be derived from the
         * request — it is configured here (Sofinco-specific provider; the fallback {@link #loginUrl} already
         * hardcodes the same site).
         */
        @AttributeDefinition(name = "Site key",
                description = "Site key whose SofincoApi connector config is used to build the direct IdP "
                        + "authorize URL for the 401 redirect.")
        String siteKey() default "sofinco";

        /**
         * Add a per-request {@code nonce} param to the authorize request (recommended for OIDC). Mirrors the
         * connector action's {@code randomNonceAdditionalParam} so this 401 flow builds the same authorize
         * URL as jahia-oauth's login-button action ({@code ConfigurableConnectToOAuthProvider}); keep in sync
         * with {@code actions-sofinco.cfg}.
         */
        @AttributeDefinition(name = "Random nonce",
                description = "Add a per-request 'nonce' param to the authorize request (recommended for OIDC). "
                        + "Mirrors the connector action's randomNonceAdditionalParam so the 401 flow matches the "
                        + "login button.")
        boolean randomNonce() default true;

        /**
         * Fixed extra authorize-request params as {@code key=value} entries (e.g. {@code prompt=login}). Mirrors
         * the connector action's {@code additionalParams_*} keys (the {@code additionalParams_} prefix stripped).
         */
        @AttributeDefinition(name = "Additional authorize params",
                description = "Fixed extra authorize-request params as key=value entries (e.g. prompt=login). "
                        + "Mirrors the connector action's additionalParams_* keys.")
        String[] additionalParams() default {};
    }

    private volatile boolean enabled = true;
    private volatile String loginUrl = "";
    private volatile String siteKey = "sofinco";
    private volatile boolean randomNonce = true;
    private final AtomicReference<String[]> additionalParams = new AtomicReference<>(new String[0]);

    private JahiaOAuthService jahiaOAuthService;
    private SettingsService settingsService;

    @Activate
    void activate(Config config) {
        apply(config);
        LoginConfig.getInstance().osgiBind(this);
        LOGGER.info("Sofinco login URL provider bound (enabled={}, loginUrl='{}')", enabled, loginUrl);
    }

    @Modified
    void modified(Config config) {
        apply(config);
        LOGGER.debug("Sofinco login URL provider reconfigured (enabled={}, loginUrl='{}')", enabled, loginUrl);
    }

    @Deactivate
    void deactivate() {
        LoginConfig.getInstance().osgiUnbind(this);
        LOGGER.info("Sofinco login URL provider unbound");
    }

    private void apply(Config config) {
        this.enabled = config.enabled();
        this.loginUrl = StringUtils.trimToEmpty(config.loginUrl());
        this.siteKey = StringUtils.trimToEmpty(config.siteKey());
        this.randomNonce = config.randomNonce();
        String[] extra = config.additionalParams();
        this.additionalParams.set(extra != null ? extra.clone() : new String[0]);
    }

    @Reference
    public void setJahiaOAuthService(JahiaOAuthService jahiaOAuthService) {
        this.jahiaOAuthService = jahiaOAuthService;
    }

    @Reference
    public void setSettingsService(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @Override
    public boolean hasCustomLoginUrl() {
        return enabled && StringUtils.isNotBlank(loginUrl);
    }

    @Override
    public String getLoginUrl(HttpServletRequest request) {
        if (!hasCustomLoginUrl()) {
            return null;
        }
        // getLoginUrl runs inside the 401 error dispatch, so request.getRequestURI() is "/error". The
        // original protected URL is the standard container error attribute set on the dispatch. (Jahia's
        // ErrorServlet also appends its own "redirect" param, but only when a urlResolver is present — not
        // reliable — so we source and pass the URL ourselves as "returnUrl".)
        String original = originalRequestUrl(request);

        // Preferred path: redirect straight to the IdP authorize URL. This needs NO anonymous Jahia render,
        // so it works even when the guest user is disabled (a .do render Action would first require read
        // access to the node it renders on, which an unauthenticated user lacks → redirect loop). It is also
        // immune to SEO vanity-URL rewriting stripping the /cms/render/live/fr prefix.
        String directUrl = buildDirectAuthorizationUrl(request, original);
        if (StringUtils.isNotBlank(directUrl)) {
            if (LOGGER.isInfoEnabled()) {
                LOGGER.info("Sofinco SSO: 401 on '{}' → redirecting straight to IdP", sanitizeForLog(original));
            }
            return directUrl;
        }

        // Fallback: the configured render-action login URL (previous behaviour). Kept so a missing connector
        // config / OAuth service degrades gracefully instead of dropping login routing entirely.
        if (StringUtils.isBlank(original)) {
            LOGGER.info("Sofinco SSO: could not resolve the original request URL for the 401 redirect");
            return loginUrl;
        }
        if (LOGGER.isInfoEnabled()) {
            LOGGER.info("Sofinco SSO: 401 on '{}' → routing to SSO render action with returnUrl (direct IdP URL "
                    + "unavailable)", sanitizeForLog(original));
        }
        String separator = loginUrl.indexOf('?') < 0 ? "?" : "&";
        return loginUrl + separator + SofincoConnectRedirectAction.RETURN_URL_PARAM + "="
                + URLEncoder.encode(original, StandardCharsets.UTF_8);
    }

    /**
     * Builds the external IdP authorize URL for a 401 redirect, or {@code null} if it can't be built (services
     * not yet bound, no connector config for the site, or jahia-oauth returned nothing) so the caller falls
     * back to the render-action URL. Mirrors jahia-oauth's own {@code ConfigurableConnectToOAuthProvider}: it
     * stashes the post-login destination in the session (read back by {@link SofincoOAuthResultFilter}), uses
     * the session id as OAuth {@code state} (jahia-oauth keys the callback's mapper results by that exact
     * value), and passes the same {@code additionalParams} map (random {@code nonce} + any fixed extras) so
     * the authorize request is identical to the login-button flow.
     */
    private String buildDirectAuthorizationUrl(HttpServletRequest request, String returnUrl) {
        if (jahiaOAuthService == null || settingsService == null || StringUtils.isBlank(siteKey)) {
            return null;
        }
        try {
            var config = settingsService.getConnectorConfig(siteKey,
                    SofincoConnectRedirectAction.CONNECTOR_NAME);
            if (config == null) {
                LOGGER.warn("Sofinco SSO: no connector config for '{}' on site '{}' — falling back to render-action "
                        + "login URL", SofincoConnectRedirectAction.CONNECTOR_NAME, siteKey);
                return null;
            }
            // Stash the post-login destination (only when same-origin-safe); the filter reads it back after the
            // IdP round-trip. The session cookie survives the round-trip, so the value is still there on return.
            if (SofincoConnectRedirectAction.isSafeReturnUrl(returnUrl)) {
                request.getSession().setAttribute(SofincoConnectRedirectAction.RETURN_URL_SESSION_ATTR, returnUrl);
                if (LOGGER.isDebugEnabled()) {
                    LOGGER.debug("Sofinco SSO: stashed return URL '{}' (session {})", sanitizeForLog(returnUrl),
                            request.getSession().getId());
                }
            }
            Map<String, String> extraParams = buildAdditionalParams();
            return StringUtils.trimToNull(jahiaOAuthService.getAuthorizationUrl(config,
                    request.getSession().getId(), extraParams.isEmpty() ? null : extraParams));
        } catch (RuntimeException e) {
            LOGGER.warn("Sofinco SSO: failed to build direct IdP authorization URL; falling back to render-action "
                    + "login URL", e);
            return null;
        }
    }

    /**
     * The additional authorize-request params, replicating jahia-oauth's {@code ConfigurableConnectToOAuthProvider}:
     * a per-request {@code nonce} (when {@link Config#randomNonce()}) plus any fixed {@code key=value} extras. The
     * nonce is not stored server-side (jahia-oauth doesn't either — it only goes into the authorize URL), so a
     * fresh value each 401 is correct.
     */
    private Map<String, String> buildAdditionalParams() {
        Map<String, String> params = new HashMap<>();
        if (randomNonce) {
            params.put("nonce", UUID.randomUUID().toString());
        }
        for (String entry : additionalParams.get()) {
            if (StringUtils.isBlank(entry)) {
                continue;
            }
            int eq = entry.indexOf('=');
            if (eq > 0) {
                params.put(entry.substring(0, eq).trim(), entry.substring(eq + 1).trim());
            } else {
                if (LOGGER.isWarnEnabled()) {
                    LOGGER.warn("Sofinco SSO: ignoring malformed additionalParams entry '{}' (expected key=value)",
                            sanitizeForLog(entry));
                }
            }
        }
        return params;
    }

    /**
     * The URL that triggered the 401, read from the servlet error-dispatch attributes (the container sets
     * {@code javax.servlet.error.request_uri}; a plain {@code getRequestURI()} would return {@code /error}).
     * Falls back to the forward URI, then the raw request URI for non-error call contexts.
     */
    private static String originalRequestUrl(HttpServletRequest request) {
        String uri = (String) request.getAttribute("javax.servlet.error.request_uri");
        if (StringUtils.isBlank(uri)) {
            uri = (String) request.getAttribute("javax.servlet.forward.request_uri");
        }
        if (StringUtils.isBlank(uri)) {
            uri = request.getRequestURI();
        }
        String query = (String) request.getAttribute("javax.servlet.error.query_string");
        if (StringUtils.isBlank(query)) {
            query = request.getQueryString();
        }
        return StringUtils.isBlank(query) ? uri : uri + "?" + query;
    }

    /**
     * Neutralizes a client-influenced value before it is written to the log. The original URI/query are
     * servlet-raw (percent-encoded), so a real CR/LF is already unlikely to reach here, but stripping
     * control characters and capping the length closes CWE-117 (log injection) as defense in depth and
     * silences the corresponding Sonar rule (java:S5145). Only the logged copy is sanitized — the
     * functional returnUrl is still URL-encoded from the untouched value.
     */
    static String sanitizeForLog(String value) {
        if (value == null) {
            return "";
        }
        String cleaned = value.replaceAll("\\p{Cntrl}", "_"); // covers \r \n \t and other control chars
        return cleaned.length() > 256 ? cleaned.substring(0, 256) + "..." : cleaned;
    }
}
