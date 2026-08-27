package com.sofinco.jahia.oauth;

import org.jahia.modules.jahiaauth.service.ConnectorConfig;
import org.jahia.services.content.JCRCallback;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.content.JCRTemplate;
import org.jahia.services.content.decorator.JCRGroupNode;
import org.jahia.services.content.decorator.JCRUserNode;
import org.jahia.services.usermanager.JahiaGroupManagerService;
import org.jahia.services.usermanager.JahiaUserManagerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Behavioural tests for {@link SofincoGroupSyncProcessor#execute} — the login-time membership
 * reconciliation. These lock the "strict design rules" from the class Javadoc, which decide whether a user
 * is added to or removed from a managed group (an access grant/revocation): membership-only, bounded
 * universe, absent-claim-skip vs empty-claim-remove-all, and best-effort (never break login).
 * <p>
 * {@link SofincoGroupSyncProcessor#parseGroups} (the pure claim parser) is covered separately in
 * {@link SofincoGroupSyncProcessorTest}. Collaborators are injected via the package-private test-seam
 * constructor; the {@code JCRTemplate.getInstance()} singleton is replaced with {@link #mockStatic} and its
 * {@code doExecuteWithSystemSession} callback is driven directly against a mock session. Typed argument
 * matchers ({@code any(JCRSessionWrapper.class)} / {@code any(JCRNodeWrapper.class)}) and a JCRNodeWrapper
 * cast disambiguate Jahia's overloaded {@code lookupUser} / {@code addMember} / {@code removeMember}.
 */
class SofincoGroupSyncProcessorExecuteTest {

    private static final String USER_ID = "jdoe";
    private static final String USER_PATH = "/users/jdoe";
    private static final String GROUP = "sofinco-editors";
    private static final String CLAIM = "groups";

    private JahiaUserManagerService userManager;
    private JahiaGroupManagerService groupManager;
    private ConnectorConfig config;
    private JCRSessionWrapper session;
    private JCRUserNode user;
    private JCRGroupNode group;

    private SofincoGroupSyncProcessor processor;

    @BeforeEach
    void setUp() {
        userManager = mock(JahiaUserManagerService.class);
        groupManager = mock(JahiaGroupManagerService.class);
        SofincoGroupConfig groupConfig = mock(SofincoGroupConfig.class);
        config = mock(ConnectorConfig.class);
        session = mock(JCRSessionWrapper.class);
        user = mock(JCRUserNode.class);
        group = mock(JCRGroupNode.class);

        processor = new SofincoGroupSyncProcessor(userManager, groupManager, groupConfig);

        // No mapper configured -> loginProp resolves to the "id" default; user id lives under results["id"].
        when(config.getMappers()).thenReturn(Collections.emptyList());
        when(groupConfig.getGroupsClaim()).thenReturn(CLAIM);
        when(groupConfig.getManagedGroups()).thenReturn(Set.of(GROUP));
        when(groupConfig.getGroupSiteKey()).thenReturn(null); // server-level
        when(user.getPath()).thenReturn(USER_PATH);
    }

    /** Runs execute() with JCRTemplate.getInstance() stubbed and its system-session callback driven. */
    private void execute(Map<String, Object> results) throws Exception {
        try (MockedStatic<JCRTemplate> jcrTemplate = mockStatic(JCRTemplate.class)) {
            JCRTemplate template = mock(JCRTemplate.class);
            jcrTemplate.when(JCRTemplate::getInstance).thenReturn(template);
            when(template.doExecuteWithSystemSession(any())).thenAnswer(inv -> {
                JCRCallback<?> callback = inv.getArgument(0);
                return callback.doInJCR(session);
            });
            processor.execute(config, results);
        }
    }

    private static Map<String, Object> results(Object groupsClaim, boolean withClaim) {
        Map<String, Object> results = new HashMap<>();
        results.put("id", USER_ID);
        if (withClaim) {
            results.put(CLAIM, groupsClaim);
        }
        return results;
    }

    @Test
    void addsMember_whenClaimGrantsAManagedGroupTheUserIsNotYetIn() throws Exception {
        when(userManager.lookupUser(any(String.class), any(JCRSessionWrapper.class))).thenReturn(user);
        when(groupManager.lookupGroup(any(), any(), any())).thenReturn(group);
        when(group.getMembers()).thenReturn(List.of()); // not a direct member yet

        execute(results(List.of(GROUP), true));

        verify(group).addMember(user);
        verify(group, never()).removeMember(any(JCRNodeWrapper.class));
        verify(session).save();
    }

    @Test
    void removesMember_whenClaimIsPresentButEmptyAndUserIsAManagedMember() throws Exception {
        when(userManager.lookupUser(any(String.class), any(JCRSessionWrapper.class))).thenReturn(user);
        when(groupManager.lookupGroup(any(), any(), any())).thenReturn(group);
        when(group.getMembers()).thenReturn(List.of(user)); // currently a direct member

        // Empty-but-present claim => the user must be removed from the managed universe.
        execute(results(List.of(), true));

        verify(group).removeMember(user);
        verify(group, never()).addMember(any(JCRNodeWrapper.class));
        verify(session).save();
    }

    @Test
    void doesNothing_whenMembershipAlreadyMatchesDesiredState() throws Exception {
        when(userManager.lookupUser(any(String.class), any(JCRSessionWrapper.class))).thenReturn(user);
        when(groupManager.lookupGroup(any(), any(), any())).thenReturn(group);
        when(group.getMembers()).thenReturn(List.of(user)); // already a member, and claim grants it

        execute(results(List.of(GROUP), true));

        verify(group, never()).addMember(any(JCRNodeWrapper.class));
        verify(group, never()).removeMember(any(JCRNodeWrapper.class));
        verify(session, never()).save(); // nothing changed
    }

    @Test
    void skipsEntirely_whenGroupsClaimIsAbsent() throws Exception {
        // Absent claim != empty claim: a missing claim means "skip sync", never touch memberships.
        execute(results(null, false));

        verify(userManager, never()).lookupUser(any(String.class), any(JCRSessionWrapper.class));
        verify(groupManager, never()).lookupGroup(any(), any(), any());
        verify(group, never()).addMember(any(JCRNodeWrapper.class));
        verify(group, never()).removeMember(any(JCRNodeWrapper.class));
    }

    @Test
    void skipsGroup_whenManagedGroupDoesNotExist_noNpe() throws Exception {
        when(userManager.lookupUser(any(String.class), any(JCRSessionWrapper.class))).thenReturn(user);
        when(groupManager.lookupGroup(any(), any(), any())).thenReturn(null); // not provisioned

        assertThatCode(() -> execute(results(List.of(GROUP), true))).doesNotThrowAnyException();

        verify(group, never()).addMember(any(JCRNodeWrapper.class));
        verify(group, never()).removeMember(any(JCRNodeWrapper.class));
        verify(session, never()).save();
    }

    @Test
    void swallowsRuntimeException_soLoginIsNeverBroken() {
        // A RuntimeException inside the session work (e.g. invalidated session) must not escape execute().
        when(userManager.lookupUser(any(String.class), any(JCRSessionWrapper.class)))
                .thenThrow(new IllegalStateException("session invalidated"));

        assertThatCode(() -> execute(results(List.of(GROUP), true))).doesNotThrowAnyException();

        verify(group, never()).addMember(any(JCRNodeWrapper.class));
        verify(group, never()).removeMember(any(JCRNodeWrapper.class));
    }
}
