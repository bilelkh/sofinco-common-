package com.sofinco.jahia.oauth;

import org.jahia.modules.jahiaauth.service.ConnectorConfig;
import org.jahia.modules.jahiaauth.service.ConnectorResultProcessor;
import org.jahia.modules.jahiaauth.service.JahiaAuthConstants;
import org.jahia.modules.jahiaauth.service.Mapping;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.content.JCRTemplate;
import org.jahia.services.content.decorator.JCRGroupNode;
import org.jahia.services.content.decorator.JCRUserNode;
import org.jahia.services.usermanager.JahiaGroupManagerService;
import org.jahia.services.usermanager.JahiaUserManagerService;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.RepositoryException;
import java.util.Collection;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Runs on every login and reconciles the user's <em>membership</em>
 * in a bounded managed universe of groups (the values of the configured claim->group map, held by
 * {@link SofincoGroupConfig}).
 * <p>
 * Strict design rules:
 * <ul>
 *   <li><b>Membership only.</b> Never creates/deletes groups, never grants/revokes roles or ACLs.
 *       Groups and their role grants are provisioned once, outside the login path
 *       (see {@code SofincoGroupInstaller} / {@code import/repository.xml}).</li>
 *   <li><b>Bounded universe.</b> Only the configured groups are ever touched; manual memberships and
 *       memberships from other sources are preserved.</li>
 *   <li><b>Absent vs empty claim.</b> A missing groups claim means "skip sync" (likely a
 *       scope/endpoint problem); only an explicitly empty list removes the user from all managed
 *       groups.</li>
 * </ul>
 * The claim->group map, the userinfo claim name, and the group site level all come from OSGi config
 * ({@link SofincoGroupConfig}, PID {@code com.sofinco.jahia.oauth.groupsync}) — nothing is hardcoded.
 * To enable, declare the groups claim in {@link SofincoConnectorImpl} (and add it to the IdP
 * scope/userinfo). If you don't need group sync, delete this class.
 */
@Component(service = ConnectorResultProcessor.class, immediate = true)
public class SofincoGroupSyncProcessor implements ConnectorResultProcessor {

    private static final Logger LOGGER = LoggerFactory.getLogger(SofincoGroupSyncProcessor.class);

    @Reference
    private JahiaUserManagerService userManager;

    @Reference
    private JahiaGroupManagerService groupManager;

    @Reference
    private SofincoGroupConfig groupConfig;

    /** DS uses field injection via this no-arg constructor. */
    public SofincoGroupSyncProcessor() {
    }

    /** Test seam: inject collaborators directly (mirrors {@code ApimServiceImpl}'s package-private ctor). */
    SofincoGroupSyncProcessor(JahiaUserManagerService userManager, JahiaGroupManagerService groupManager,
            SofincoGroupConfig groupConfig) {
        this.userManager = userManager;
        this.groupManager = groupManager;
        this.groupConfig = groupConfig;
    }

    @Override
    public void execute(ConnectorConfig config, Map<String, Object> results) {
        // 1) Resolve the Jahia username = the connector property mapped to ssoLoginId.
        String loginProp = resolveLoginProperty(config);
        Object idVal = results.get(loginProp);
        if (idVal == null) {
            return;
        }
        var userId = String.valueOf(idVal);

        // 2) SAFETY: absent claim != empty claim.
        String groupsClaim = groupConfig.getGroupsClaim();
        if (!results.containsKey(groupsClaim)) {
            LOGGER.warn("No '{}' claim for {} - skipping group sync (check scope/userinfo).", groupsClaim, userId);
            return;
        }
        Set<String> managedGroups = groupConfig.getManagedGroups();
        String groupSiteKey = groupConfig.getGroupSiteKey();
        // claim value == group name, so the desired set is the claim values that fall in the managed universe.
        Set<String> desired = parseGroups(results.get(groupsClaim)).stream()
                .filter(managedGroups::contains)
                .collect(Collectors.toSet());

        try {
            JCRTemplate.getInstance().doExecuteWithSystemSession(session -> {
                JCRUserNode user = userManager.lookupUser(userId, session);
                if (user == null) {
                    // jahia-oauth's jcr-auth-provider creates the user from the ssoLoginId mapping; if the
                    // stored username differs from this lookup key (loginProp='{}'), sync silently no-ops and
                    // managed-group membership is never reconciled. WARN so the mismatch is diagnosable.
                    LOGGER.warn("No Jahia user found for '{}' (login property '{}') - skipping group sync; "
                            + "verify the ssoLoginId mapping matches this key.", userId, loginProp);
                    return null;
                }

                // 3) Full sync over the managed universe ONLY. Membership only.
                if (syncMemberships(session, user, managedGroups, desired, groupSiteKey)) {
                    session.save();
                }
                return null;
            });
        } catch (RepositoryException | RuntimeException e) {
            // Group sync is a best-effort side-effect of login (see class Javadoc): it must never break
            // the login. Swallow and log with the full stack trace; do NOT rethrow. RuntimeException is
            // caught too (e.g. IllegalStateException on an invalidated session, or a throwing custom Jahia
            // plugin) so nothing escapes into jahia-oauth's post-callback processing.
            LOGGER.error("Group sync failed for {} - login continues without group reconciliation: {}",
                    userId, e.getMessage(), e);
        }
    }

    /** The connector property mapped to {@code ssoLoginId}, i.e. the Jahia username key. */
    private static String resolveLoginProperty(ConnectorConfig config) {
        return config.getMappers().stream()
                .flatMap(m -> m.getMappings().stream())
                .filter(mp -> JahiaAuthConstants.SSO_LOGIN.equals(mp.getMappedProperty()))
                .map(Mapping::getConnectorProperty).findFirst().orElse("id");
    }

    /**
     * Reconciles direct membership over the managed universe only. Never creates or deletes a group,
     * never touches roles.
     *
     * @return {@code true} if at least one membership changed and the session needs saving
     */
    private boolean syncMemberships(JCRSessionWrapper session, JCRUserNode user, Set<String> managedGroups,
            Set<String> desired, String groupSiteKey) {
        var changed = false;
        for (String groupName : managedGroups) {
            JCRGroupNode group = groupManager.lookupGroup(groupSiteKey, groupName, session); // null = server-level
            if (group == null) {
                LOGGER.warn("Managed group '{}' does not exist; skipping (provision it once, outside login).",
                        groupName);
                continue;
            }
            boolean shouldBeMember = desired.contains(groupName);
            boolean isDirectMember = isDirectMember(group, user);

            if (shouldBeMember && !isDirectMember) {
                group.addMember(user);
                changed = true;
            } else if (!shouldBeMember && isDirectMember) {
                group.removeMember(user);
                changed = true;
            }
            // NEVER deleteGroup, NEVER revokeRoles here.
        }
        return changed;
    }

    private static boolean isDirectMember(JCRGroupNode group, JCRNodeWrapper user) {
        var members = group.getMembers(); // direct members only
        var userPath = user.getPath();
        for (JCRNodeWrapper member : members) {
            if (member.getPath().equals(userPath)) {
                return true;
            }
        }
        return false;
    }

    static Set<String> parseGroups(Object claim) {
        if (claim == null) {
            return new HashSet<>();
        }
        if (claim instanceof org.json.JSONArray array) { // declared in availableProperties -> JSONArray
            return fromJsonArray(array);
        }
        if (claim instanceof Collection<?> collection) { // JSONPath enhancement -> List
            return fromCollection(collection);
        }
        return fromDelimitedString(String.valueOf(claim)); // CSV / space-separated string
    }

    private static Set<String> fromJsonArray(org.json.JSONArray array) {
        Set<String> out = new HashSet<>();
        var length = array.length();
        for (var i = 0; i < length; i++) {
            var v = array.optString(i);
            if (!v.isEmpty()) {
                out.add(v);
            }
        }
        return out;
    }

    private static Set<String> fromCollection(Collection<?> values) {
        Set<String> out = new HashSet<>();
        for (Object o : values) {
            if (o == null) { // null element -> String.valueOf would yield literal "null" (cf. JSONArray branch)
                continue;
            }
            var v = String.valueOf(o);
            if (!v.isEmpty()) {
                out.add(v);
            }
        }
        return out;
    }

    private static Set<String> fromDelimitedString(String csv) {
        Set<String> out = new HashSet<>();
        var tokens = csv.split("[,\\s]+");
        for (String s : tokens) {
            if (!s.isEmpty()) {
                out.add(s);
            }
        }
        return out;
    }
}
