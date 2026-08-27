package com.sofinco.jahia.oauth;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link SofincoConnectRedirectAction#isSafeReturnUrl}. This guard protects the
 * post-login {@code returnUrl}, which is (a) used verbatim as a redirect target — an unvalidated value is
 * an open redirect — and (b) inlined into a JS string by {@link SofincoOAuthResultFilter} — an
 * unvalidated value is a reflected XSS. Both failure modes are security-relevant, so the accept/reject
 * boundary is pinned down here.
 */
class SofincoConnectRedirectActionTest {

    @Test
    void accepts_siteRelativePaths() {
        assertThat(SofincoConnectRedirectAction.isSafeReturnUrl("/")).isTrue();
        assertThat(SofincoConnectRedirectAction.isSafeReturnUrl("/jahia/dashboard")).isTrue();
        assertThat(SofincoConnectRedirectAction.isSafeReturnUrl("/cms/render/live/fr/sites/sofinco/x.html")).isTrue();
        assertThat(SofincoConnectRedirectAction.isSafeReturnUrl("/page.html?a=1&b=2")).isTrue();
    }

    @Test
    void rejects_null() {
        assertThat(SofincoConnectRedirectAction.isSafeReturnUrl(null)).isFalse();
    }

    @Test
    void rejects_openRedirectVectors() {
        // Protocol-relative and absolute URLs must not be accepted (would redirect off-site).
        assertThat(SofincoConnectRedirectAction.isSafeReturnUrl("//evil.com")).isFalse();
        assertThat(SofincoConnectRedirectAction.isSafeReturnUrl("https://evil.com")).isFalse();
        assertThat(SofincoConnectRedirectAction.isSafeReturnUrl("evil.com")).isFalse();
        assertThat(SofincoConnectRedirectAction.isSafeReturnUrl("")).isFalse();
    }

    @Test
    void rejects_jsStringBreakoutCharacters() {
        // Quotes / angle brackets / backslash / whitespace would break out of the inlined JS string.
        assertThat(SofincoConnectRedirectAction.isSafeReturnUrl("/x');alert(1)//")).isFalse();
        assertThat(SofincoConnectRedirectAction.isSafeReturnUrl("/x\"onerror=")).isFalse();
        assertThat(SofincoConnectRedirectAction.isSafeReturnUrl("/x<script>")).isFalse();
        assertThat(SofincoConnectRedirectAction.isSafeReturnUrl("/a b")).isFalse();
    }

    @Test
    void rejects_backslashProtocolRelative() {
        assertThat(SofincoConnectRedirectAction.isSafeReturnUrl("/\\evil.com")).isFalse();
        assertThat(SofincoConnectRedirectAction.isSafeReturnUrl("/\\\\evil.com")).isFalse();
    }
}
