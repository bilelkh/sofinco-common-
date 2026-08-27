package com.sofinco.jahia.oauth;

import org.jahia.modules.jahiaoauth.service.JahiaOAuthService;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Deactivate;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Registers the {@link SofincoApiBuilder} with jahia-oauth's API registry under the key
 * {@code "SofincoApi"} on activation, and removes it on deactivation.
 * <p>
 * Forgetting this registration causes an NPE on the first login: {@code createOAuth20Service} does a
 * {@code .get("SofincoApi").build(...)} on a {@code null}. The registry key MUST match the connector
 * service name ({@code SofincoApi}); because they are identical, no {@code oauthApiName} needs to be
 * stored in the saved config (the lookup falls back to the connector name).
 */
@Component(immediate = true)
public class SofincoApiRegistrar {

    private static final Logger LOGGER = LoggerFactory.getLogger(SofincoApiRegistrar.class);

    public static final String API_NAME = "SofincoApi";

    private JahiaOAuthService jahiaOAuthService;

    @Reference
    public void setJahiaOAuthService(JahiaOAuthService jahiaOAuthService) {
        this.jahiaOAuthService = jahiaOAuthService;
    }

    @Activate
    public void activate() {
        jahiaOAuthService.addOAuthDefaultApi20(API_NAME, new SofincoApiBuilder());
        LOGGER.info("Registered OAuth API builder '{}'", API_NAME);
    }

    @Deactivate
    public void deactivate() {
        jahiaOAuthService.removeOAuthDefaultApi20(API_NAME);
        LOGGER.info("Removed OAuth API builder '{}'", API_NAME);
    }
}
