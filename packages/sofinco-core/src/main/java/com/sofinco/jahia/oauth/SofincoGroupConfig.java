package com.sofinco.jahia.oauth;

import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Modified;
import org.osgi.service.metatype.annotations.AttributeDefinition;
import org.osgi.service.metatype.annotations.Designate;
import org.osgi.service.metatype.annotations.ObjectClassDefinition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Single source of truth for the group-sync "managed universe", driven by OSGi Config Admin so the
 * values are editable on a running server instead of hardcoded in Java. Both
 * {@link SofincoGroupSyncProcessor} (per-login membership reconciliation) and
 * {@link SofincoGroupInstaller} (one-time provisioning) reference this holder, so they can never drift.
 * <p>
 * Configuration is delivered under PID {@code com.sofinco.jahia.oauth.groupsync} (shipped default:
 * {@code META-INF/configurations/com.sofinco.jahia.oauth.groupsync.cfg}). The nested {@link Config}
 * is a DS <em>Component Property Type</em> whose method defaults bnd reads at build time. It is also
 * annotated with OSGi Metatype ({@link ObjectClassDefinition}/{@link Designate}) so the PID is
 * discoverable and typed in the OSGi config console (labels/descriptions/defaults) instead of being a
 * blind {@code .cfg} edit — the annotations have CLASS retention (build-time only, no runtime import).
 */
@Component(service = SofincoGroupConfig.class, immediate = true,
        configurationPid = "com.sofinco.jahia.oauth.groupsync")
@Designate(ocd = SofincoGroupConfig.Config.class)
public class SofincoGroupConfig {

    private static final Logger LOGGER = LoggerFactory.getLogger(SofincoGroupConfig.class);

    /**
     * DS Component Property Type. Property keys map from the method names: {@code managedGroups},
     * {@code groupsClaim}, {@code groupSiteKey}. Defaults below apply when no {@code .cfg} is present.
     * The {@code @AttributeDefinition} descriptions drive the OSGi config console (ops-facing).
     */
    @ObjectClassDefinition(name = "Sofinco OAuth — Group Sync",
            description = "Managed-group universe and claim mapping for the login-time group membership sync "
                    + "(SofincoGroupSyncProcessor). Membership only — never creates/deletes groups or roles.")
    @interface Config {
        /**
         * Comma-separated list of group names forming the managed universe. The IdP "groups" claim
         * value and the Jahia group name are identical, so one list serves both sides. Kept as a single
         * String (not String[]) so it survives classic Karaf {@code .cfg} delivery, which hands
         * properties over as plain strings, not arrays.
         */
        @AttributeDefinition(required = false, name = "Managed groups",
                description = "Comma-separated group names forming the managed universe. The IdP 'groups' claim "
                        + "value and the Jahia group name are identical. Empty => no group is managed (sync inert).")
        String managedGroups() default "sofinco-editors,sofinco-admins";

        /** Userinfo claim that carries the user's group memberships. */
        @AttributeDefinition(name = "Groups claim",
                description = "Userinfo claim that carries the user's group memberships.")
        String groupsClaim() default "groups";

        /** Group scope: blank => server-level ({@code /groups}); otherwise a site key ({@code /sites/<key>/groups}). */
        @AttributeDefinition(required = false, name = "Group site key",
                description = "Blank => server-level groups (/groups); otherwise a site key (/sites/<key>/groups).")
        String groupSiteKey() default "";

        /**
         * When {@code true}, {@link SofincoGroupInstaller} auto-creates any missing managed group on
         * activation. Default {@code false}: groups are expected to be provisioned out-of-band (e.g.
         * {@code import/repository.xml}) and the installer leaves the repository untouched.
         */
        @AttributeDefinition(name = "Auto-create missing groups",
                description = "When true, SofincoGroupInstaller creates any missing managed group on activation. "
                        + "Default false: groups are provisioned out-of-band (import/repository.xml).")
        boolean autoCreateGroups() default false;
    }

    private final AtomicReference<Set<String>> managedGroups = new AtomicReference<>(Set.of());
    private volatile String groupsClaim = "groups";
    private volatile String groupSiteKey = null;
    private volatile boolean autoCreateGroups = false;

    @Activate
    @Modified
    void activate(Config config) {
        this.managedGroups.set(parseManagedGroups(config.managedGroups()));
        this.groupsClaim = config.groupsClaim();
        this.groupSiteKey = normalizeSiteKey(config.groupSiteKey());
        this.autoCreateGroups = config.autoCreateGroups();
        LOGGER.debug("Group sync config: managedGroups={}, groupsClaim={}, groupSiteKey={}, autoCreateGroups={}",
                this.managedGroups.get(), this.groupsClaim, this.groupSiteKey, this.autoCreateGroups);
    }

    /**
     * Parses the comma-separated {@code managedGroups} string into an ordered, unmodifiable set.
     * Shared with {@link SofincoGroupInstaller} (which binds the same PID directly) so the per-login
     * processor and the provisioner can never disagree on the managed universe.
     */
    static Set<String> parseManagedGroups(String csv) {
        if (csv == null || csv.isBlank()) { // empty/absent .cfg value => empty universe, not an NPE (cf. normalizeSiteKey)
            return Set.of();
        }
        Set<String> groups = new LinkedHashSet<>();
        for (String entry : csv.split(",")) {
            String e = entry.trim();
            if (!e.isEmpty()) {
                groups.add(e);
            }
        }
        return Collections.unmodifiableSet(groups);
    }

    /** Normalizes a configured site key: blank/null =&gt; {@code null} (server-level). */
    static String normalizeSiteKey(String sk) {
        return (sk == null || sk.isBlank()) ? null : sk.trim();
    }

    /** The bounded set of group names this connector is allowed to manage/provision (claim value == group name). */
    Set<String> getManagedGroups() {
        return managedGroups.get();
    }

    /** Userinfo claim carrying group memberships. */
    String getGroupsClaim() {
        return groupsClaim;
    }

    /** Group scope; {@code null} = server-level. */
    String getGroupSiteKey() {
        return groupSiteKey;
    }

    /** Whether the installer should auto-create missing managed groups on activation. */
    boolean isAutoCreateGroups() {
        return autoCreateGroups;
    }
}
