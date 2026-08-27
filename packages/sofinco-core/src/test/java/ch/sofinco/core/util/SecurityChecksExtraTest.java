package ch.sofinco.core.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Cas adverses additionnels pour {@link SecurityChecks} (extension de {@code SecurityChecksTest}).
 */
class SecurityChecksExtraTest {

    // ----------------------------------------------------------------- variantes de casse / espaces

    @Test
    void uppercaseHttpScheme_treatedSameAsLowercase() {
        // URI accepte HTTP:// — la méthode doit le reconnaître via scheme equalsIgnoreCase.
        assertThat(SecurityChecks.isInsecureHttpNonLocal("HTTP://localhost")).isFalse();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("Http://api.example.com")).isTrue();
    }

    @Test
    void uppercaseHostLocalhost_accepted() {
        // localhost en majuscules est valide DNS (case-insensitive).
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://LOCALHOST")).isFalse();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://LocalHost:8080")).isFalse();
    }

    @Test
    void urlWithLeadingTrailingWhitespace_trimmedBeforeCheck() {
        // L'implémentation appelle .trim() avant URI.create.
        assertThat(SecurityChecks.isInsecureHttpNonLocal("  http://localhost  ")).isFalse();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("  http://evil.example.com  ")).isTrue();
    }

    // ----------------------------------------------------------------- variantes IPv6

    @Test
    void ipv6FullForm_loopbackAccepted() {
        // ::1 = forme courte de loopback IPv6.
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://[::1]:9000/api")).isFalse();
    }

    @Test
    void ipv6Different_refused() {
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://[2001:db8::1]")).isTrue();
    }

    // ----------------------------------------------------------------- chemins / userinfo

    @Test
    void urlWithUserInfo_hostExtractedCorrectly() {
        // user:pass@host — l'hôte doit être extrait correctement (URI le fait).
        // Note : c'est lui-même un anti-pattern (credentials en URL).
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://user:pass@localhost")).isFalse();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://user:pass@evil.example.com")).isTrue();
    }

    @Test
    void urlWithPathQueryFragment_hostStillExtracted() {
        assertThat(SecurityChecks.isInsecureHttpNonLocal(
                "http://localhost:8080/path/to/resource?q=1&r=2#frag")).isFalse();
        assertThat(SecurityChecks.isInsecureHttpNonLocal(
                "http://api.evil.com/path/to/resource?q=1#frag")).isTrue();
    }

    // ----------------------------------------------------------------- schèmes inhabituels

    @Test
    void httpsSchemeAlwaysAccepted_evenForRemoteHost() {
        assertThat(SecurityChecks.isInsecureHttpNonLocal("https://prod-apim.cacf.local")).isFalse();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("https://any.example.com:8443/path")).isFalse();
    }

    @Test
    void wsAndWssScheme_notFlaggedByThisFunction() {
        // Cette fonction ne concerne que http/https. ws/wss sont laissés à un autre contrôle.
        assertThat(SecurityChecks.isInsecureHttpNonLocal("ws://anywhere.example.com")).isFalse();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("wss://anywhere.example.com")).isFalse();
    }

    // ----------------------------------------------------------------- fail-closed sur entrées exotiques

    @Test
    void urlWithControlChars_failClosed() {
        // Caractères de contrôle dans l'URL → URI.create lève → fail-closed.
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://localhost\u0000injected")).isTrue();
    }

    @Test
    void urlMissingHost_failClosed() {
        // http:// sans host → URI.getHost() == null → fail-closed.
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http:///path-only")).isTrue();
    }

    @Test
    void urlWithSpacesInPath_failClosed() {
        // Espaces non encodés → URI.create lève IllegalArgumentException.
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://host /path")).isTrue();
    }
}
