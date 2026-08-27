package ch.sofinco.core.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LogSanitizerTest {

    @Test
    void authorizationBearerMasked() {
        String input = "Authorization: Bearer abc-def-123-token-xyz";
        String out = LogSanitizer.sanitize(input);
        assertThat(out).doesNotContain("abc-def-123-token-xyz").contains("***MASKED***");
        assertThat(out.toLowerCase()).contains("bearer");
    }

    @Test
    void authorizationBasicMasked() {
        String input = "Authorization: Basic dXNlcjpwYXNzd29yZA==";
        String out = LogSanitizer.sanitize(input);
        assertThat(out).doesNotContain("dXNlcjpwYXNzd29yZA");
        assertThat(out.toLowerCase()).contains("basic");
    }

    @Test
    void sensitiveKeyValuePairsMasked() {
        assertThat(LogSanitizer.sanitize("password=hunter2 logged"))
                .doesNotContain("hunter2").contains("password=***MASKED***");
        assertThat(LogSanitizer.sanitize("client_secret=abc123 partner"))
                .doesNotContain("abc123");
        assertThat(LogSanitizer.sanitize("\"access_token\":\"xyzzy\""))
                .doesNotContain("xyzzy");
        assertThat(LogSanitizer.sanitize("apikey: secret-key"))
                .doesNotContain("secret-key");
    }

    @Test
    void uuidsMasked() {
        String input = "User UUID: 550e8400-e29b-41d4-a716-446655440000 logged in";
        String out = LogSanitizer.sanitize(input);
        assertThat(out).doesNotContain("550e8400-e29b-41d4-a716-446655440000")
                .contains("********-****-****-****-************");
    }

    @Test
    void businessTokenWithoutWordBoundaryNotMasked() {
        // "customerTokenList" ne doit PAS être masqué (word boundary anti faux-positif).
        String input = "customerTokenList=42 items";
        String out = LogSanitizer.sanitize(input);
        assertThat(out).contains("customerTokenList=42");
    }

    /**
     * Anti log-forgery (CWE-117) : un message d'erreur portant du contenu distant ne doit pas
     * pouvoir écrire de fausses lignes dans le journal.
     */
    @Test
    void controlCharactersCollapsedToASingleLine() {
        String input = "boom\r\n2026-01-01 INFO  Utilisateur admin authentifié\tsuite";
        String out = LogSanitizer.sanitize(input);
        assertThat(out).doesNotContain("\r").doesNotContain("\n").doesNotContain("\t")
                .isEqualTo("boom 2026-01-01 INFO  Utilisateur admin authentifié suite");
    }

    /** L'aplatissement passe AVANT le masquage : un CR ne doit pas casser un motif sensible. */
    @Test
    void aSecretSplitByANewlineIsStillMasked() {
        assertThat(LogSanitizer.sanitize("password=\nhunter2 logged")).doesNotContain("hunter2");
    }

    @Test
    void nullAndEmptySafe() {
        assertThat(LogSanitizer.sanitize(null)).isEmpty();
        assertThat(LogSanitizer.sanitize("")).isEmpty();
        assertThat(LogSanitizer.truncate(null, 10)).isEmpty();
    }

    @Test
    void truncateLongString() {
        String input = "a".repeat(1000);
        String out = LogSanitizer.truncate(input, 100);
        assertThat(out).hasSize(100 + "...[truncated]".length()).endsWith("...[truncated]");
    }

    @Test
    void safeLogCombinesTruncateThenSanitize() {
        String input = "X".repeat(900) + " password=secret123";
        String out = LogSanitizer.safeLog(input, 50);
        // truncate à 50 → la partie "password=" est éliminée → pas de masquage, juste truncate
        assertThat(out).hasSize(50 + "...[truncated]".length()).doesNotContain("secret123");
    }
}
