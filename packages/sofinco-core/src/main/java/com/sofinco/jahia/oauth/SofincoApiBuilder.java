package com.sofinco.jahia.oauth;

import com.github.scribejava.core.builder.api.DefaultApi20;
import org.jahia.modules.jahiaauth.service.ConnectorConfig;
import org.jahia.modules.jahiaoauth.service.JahiaOAuthAPIBuilder;

/**
 * Builds a {@link SofincoApi} from the per-site {@code ConnectorConfig}, reading the deployment-specific
 * authorize and token endpoints. Registered against the {@code "SofincoApi"} key by
 * {@link SofincoApiRegistrar}.
 */
public class SofincoApiBuilder implements JahiaOAuthAPIBuilder {

    @Override
    public DefaultApi20 build(ConnectorConfig config) {
        // Fail fast on a half-provisioned site: null/blank endpoints would otherwise surface much later
        // as a malformed "null?..." authorize URL or an NPE deep inside ScribeJava on the first login,
        // with an unactionable stack trace. Stop here with a diagnostic that names the missing keys.
        String authUrl = config.getProperty("authorizationBaseUrl");
        String tokenUrl = config.getProperty("accessTokenEndpoint");
        if (authUrl == null || authUrl.isBlank() || tokenUrl == null || tokenUrl.isBlank()) {
            throw new IllegalStateException("Incomplete Sofinco OAuth configuration - missing endpoints "
                    + "(authorizationBaseUrl='" + authUrl + "', accessTokenEndpoint='" + tokenUrl + "'). "
                    + "Check the 'SofincoApi' connector configuration for this site.");
        }
        return new SofincoApi(authUrl, tokenUrl);
    }
}
