package ch.sofinco.core.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityChecksTest {

    @Test
    void httpsAlwaysAccepted() {
        assertThat(SecurityChecks.isInsecureHttpNonLocal("https://rct-api.sofinco.fr")).isFalse();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("https://api.sofinco.fr/v3/path")).isFalse();
    }

    @Test
    void httpLoopbackAccepted() {
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://localhost")).isFalse();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://localhost:8080")).isFalse();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://127.0.0.1")).isFalse();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://127.0.0.1:9000/path")).isFalse();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://[::1]")).isFalse();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://[::1]:8080")).isFalse();
    }

    @Test
    void httpRemoteRefused() {
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://api.sofinco.fr")).isTrue();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://10.0.0.5:8080")).isTrue();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://prod-apim.cacf.local")).isTrue();
    }

    @Test
    void maliciousHostShapedLikeLocalhostRefused() {
        // L'ancien code "url.contains("localhost")" laisserait passer ces hôtes.
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://localhost.attaquant.com")).isTrue();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://attaquant.com/localhost")).isTrue();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://127.0.0.1.attaquant.com")).isTrue();
    }

    @Test
    void blankOrNullAccepted() {
        assertThat(SecurityChecks.isInsecureHttpNonLocal(null)).isFalse();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("")).isFalse();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("   ")).isFalse();
    }

    @Test
    void malformedUriFailsClosed() {
        // Une URL non parsable doit être REFUSÉE (fail-closed), pas acceptée par défaut.
        assertThat(SecurityChecks.isInsecureHttpNonLocal("http://[invalid uri")).isTrue();
    }

    @Test
    void nonHttpSchemeAccepted() {
        assertThat(SecurityChecks.isInsecureHttpNonLocal("ftp://anywhere")).isFalse();
        assertThat(SecurityChecks.isInsecureHttpNonLocal("file:///etc/passwd")).isFalse();
    }
}
