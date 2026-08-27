package com.sofinco.jahia.oauth;

import com.github.scribejava.apis.openid.OpenIdJsonTokenExtractor;
import com.github.scribejava.core.builder.api.DefaultApi20;
import com.github.scribejava.core.extractors.TokenExtractor;
import com.github.scribejava.core.model.OAuth2AccessToken;
import com.github.scribejava.core.oauth2.clientauthentication.ClientAuthentication;
import com.github.scribejava.core.oauth2.clientauthentication.RequestBodyAuthenticationScheme;

import java.util.Objects;

/**
 * ScribeJava {@link DefaultApi20} for a generic OpenID Connect IdP.
 * <p>
 * Modeled on {@code scribejava/apis/FranceConnectApi}: the authorize and token endpoints vary per
 * deployment, so they are supplied per-instance (built from {@code ConnectorConfig} by
 * {@link SofincoApiBuilder}) rather than hardcoded.
 */
public class SofincoApi extends DefaultApi20 {

    private final String authorizationBaseUrl;
    private final String accessTokenEndpoint;

    public SofincoApi(String authorizationBaseUrl, String accessTokenEndpoint) {
        // Class invariant (defense in depth). The reachable failure path is already covered upstream with a
        // far more actionable message in SofincoApiBuilder, which also rejects blanks; this only hardens
        // direct instantiation. Terse messages on purpose: the constructor has no config context.
        this.authorizationBaseUrl = Objects.requireNonNull(authorizationBaseUrl, "authorizationBaseUrl");
        this.accessTokenEndpoint = Objects.requireNonNull(accessTokenEndpoint, "accessTokenEndpoint");
    }

    @Override
    public String getAccessTokenEndpoint() {
        return accessTokenEndpoint;
    }

    @Override
    protected String getAuthorizationBaseUrl() {
        return authorizationBaseUrl;
    }

    /**
     * Most OIDC providers expect the client credentials in the request body. Switch to
     * {@code HttpBasicAuthenticationScheme.instance()} if your IdP requires HTTP Basic auth.
     */
    @Override
    public ClientAuthentication getClientAuthentication() {
        return RequestBodyAuthenticationScheme.instance();
    }

    /** Extract the OpenID {@code id_token} alongside the access token (OIDC providers return both). */
    @Override
    public TokenExtractor<OAuth2AccessToken> getAccessTokenExtractor() {
         return OpenIdJsonTokenExtractor.instance();
    }
}
