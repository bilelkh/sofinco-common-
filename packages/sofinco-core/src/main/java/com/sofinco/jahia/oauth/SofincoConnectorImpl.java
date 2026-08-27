package com.sofinco.jahia.oauth;

import org.jahia.modules.jahiaauth.service.ConnectorConfig;
import org.jahia.modules.jahiaauth.service.ConnectorPropertyInfo;
import org.jahia.modules.jahiaauth.service.ConnectorService;
import org.jahia.modules.jahiaauth.service.JahiaAuthConstants;
import org.jahia.modules.jahiaoauth.service.OAuthConnectorService;
import org.osgi.service.component.annotations.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * The Sofinco connector. Resolved by the runtime via the {@code CONNECTOR_SERVICE_NAME=SofincoApi}
 * component property — this string is the naming contract and must be byte-identical with the API
 * registry key, the {@code .cfg} {@code connectorName}, the JS {@code connectorServiceName}, and the
 * mappers path.
 * <p>
 * Implements the EXPORTED interfaces ({@link OAuthConnectorService} / {@link ConnectorService})
 * directly. It deliberately does NOT extend the abstract {@code jahiaoauth.connectors.Connector}: that
 * package is not exported by jahia-oauth 4.0.0, so an external bundle cannot link against it. We hold
 * the {@code availableProperties} list ourselves.
 * <p>
 * Declares the OIDC claims to extract from the userinfo endpoint and returns the per-config userinfo
 * URL as the protected-resource URL. Endpoints come from config, not from the enterprise
 * {@code JahiaOAuthConfiguration}.
 */
@Component(
        service = {ConnectorService.class, OAuthConnectorService.class},
        property = {JahiaAuthConstants.CONNECTOR_SERVICE_NAME + "=SofincoApi"},
        immediate = true)
public class SofincoConnectorImpl implements OAuthConnectorService {

    /** Seul {@code valueType} utilisé ici — voir la note sur {@code groups} plus bas. */
    private static final String TYPE_STRING = "string";

    /** Objet englobant les claims d'identité du payload userinfo. */
    private static final String CLAIM_USER_CONTEXT = "user_context";

    private final List<ConnectorPropertyInfo> availableProperties = buildAvailableProperties();

    @Override
    public String getProtectedResourceUrl(ConnectorConfig config) {
        // e.g. https://idp.example.com/.../userinfo
        return config.getProperty("userInfoEndpoint");
    }

    @Override
    public List<ConnectorPropertyInfo> getAvailableProperties() {
        return availableProperties;
    }

    /**
     * Declares the claims to extract from the Sofinco userinfo payload, which nests them under two
     * objects:
     *
     * <pre>
     * sub                    -&gt; flat, top-level
     * user_context           -&gt; firstname, lastname, email
     * authorization_context  -&gt; user_id, groups
     * </pre>
     *
     * jahia-oauth extracts a nested claim when {@code propertyToRequest} is the top-level object key
     * and {@code valuePath} is the {@code /}-delimited path within it (arrays use {@code [index]}).
     * A null {@code valuePath} reads {@code propertyToRequest} as a top-level value (so {@code sub}
     * stays flat). The {@code name} is the key the value lands under in the results map.
     */
    private static List<ConnectorPropertyInfo> buildAvailableProperties() {
        List<ConnectorPropertyInfo> properties = new ArrayList<>();

        // Top-level "sub" -> "id" (the ssoLoginId source via the mappers).
        properties.add(nested("id", TYPE_STRING, "sub", null));

        // user_context.*
        properties.add(nested("email", "email", CLAIM_USER_CONTEXT, "/email"));
        properties.add(nested("given_name", TYPE_STRING, CLAIM_USER_CONTEXT, "/firstname"));
        properties.add(nested("family_name", TYPE_STRING, CLAIM_USER_CONTEXT, "/lastname"));

        // authorization_context.*
        properties.add(nested("preferred_username", TYPE_STRING, "authorization_context", "/user_id"));

        // For group/rights sync (Section 18): authorization_context.groups arrives as a JSON array,
        // consumed directly by SofincoGroupSyncProcessor.parseGroups (which also handles List/CSV
        // defensively). valueType="string" is only the mappers-UI label hint (drives the
        // SofincoApi.label.groups i18n key) — jahia-oauth does NOT coerce the value by valueType
        // (getValueType() is never read during extraction, verified in jahia-oauth 4.0.0 /
        // jahia-authentication 1.8.0), so the raw JSONArray passes through unchanged. Do not "fix" this to
        // "array": no such type exists in this property model, and it would not change extraction.
        properties.add(nested("groups", TYPE_STRING, "authorization_context", "/groups"));

        return properties;
    }

    private static ConnectorPropertyInfo nested(String name, String valueType, String propertyToRequest, String valuePath) {
        var info = new ConnectorPropertyInfo(name, valueType);
        info.setPropertyToRequest(propertyToRequest);
        info.setValuePath(valuePath);
        return info;
    }
}
