package com.sofinco.jahia.oauth;

import org.jahia.services.content.JCRTemplate;
import org.jahia.services.content.decorator.JCRGroupNode;
import org.jahia.services.usermanager.JahiaGroupManagerService;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Modified;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Set;

/**
 * OPTIONAL (Section 18.3 of the plan). Idempotent provisioning of the managed groups and their role
 * grants, kept strictly OUT of the login path so that {@link SofincoGroupSyncProcessor} only ever
 * flips membership.
 * <p>
 * {@code grantRoles} is additive/idempotent; this installer never revokes. Rights flow group -> role,
 * so removing a user from a group (on next login) is what withdraws access.
 * <p>
 * VERIFY the role names ({@code editor}, {@code server-administrator}) and the target node paths on
 * your instance before relying on this. Prefer the declarative {@code import/repository.xml} route if
 * you want the grants reviewable in version control. Delete this class if you provision elsewhere.
 * <p>
 * This component <em>binds the same config PID as {@link SofincoGroupConfig}</em>
 * ({@code com.sofinco.jahia.oauth.groupsync}) and re-runs provisioning on every {@code @Modified}, so
 * adding a group to the config on a running server creates it immediately — no redeploy/restart. It
 * reads the managed universe straight from the {@link SofincoGroupConfig.Config} it is handed (parsed
 * through the same shared helper the holder uses), so there is no cross-component ordering race and the
 * two views can never drift.
 * <p>
 * Auto-creation is gated by the {@code autoCreateGroups} config flag (default {@code false}): when
 * disabled, this installer is a no-op and groups must be provisioned out-of-band.
 */
@Component(immediate = true, configurationPid = "com.sofinco.jahia.oauth.groupsync")
public class SofincoGroupInstaller {

    private static final Logger LOGGER = LoggerFactory.getLogger(SofincoGroupInstaller.class);

    @Reference
    private JahiaGroupManagerService groupManager;

    @Activate
    @Modified
    public void activate(SofincoGroupConfig.Config config) {
        if (!config.autoCreateGroups()) {
            LOGGER.info("autoCreateGroups=false; skipping group provisioning (provision out-of-band).");
            return;
        }
        Set<String> managedGroups = SofincoGroupConfig.parseManagedGroups(config.managedGroups());
        String siteKey = SofincoGroupConfig.normalizeSiteKey(config.groupSiteKey()); // null = server-level
        try {
            JCRTemplate.getInstance().doExecuteWithSystemSession(session -> {
                for (String name : managedGroups) {
                    ensureGroup(name, siteKey, session);
                }

                session.save();
                return null;
            });
        } catch (Exception e) {
            LOGGER.error("Sofinco group provisioning failed: {}", e.getMessage(), e);
        }
    }

    private void ensureGroup(String name, String siteKey, org.jahia.services.content.JCRSessionWrapper session) {
        JCRGroupNode group = groupManager.lookupGroup(siteKey, name, session); // null siteKey = server-level
        if (group == null) {
            groupManager.createGroup(siteKey, name, null, false, session);
            LOGGER.info("Created group '{}' (siteKey={})", name, siteKey);
        }
    }
}
