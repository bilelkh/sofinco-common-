package ch.sofinco.core.util;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.params.provider.Arguments.arguments;

/**
 * Cas adverses additionnels pour {@link LogSanitizer}.
 */
class LogSanitizerExtraTest {

    // ----------------------------------------------------------------- secrets multiples dans le même log

    @Test
    void multipleSecretsInSameString_allMasked() {
        String input = "Authorization: Bearer first-token-abc and password=hunter2 and uuid 550e8400-e29b-41d4-a716-446655440000";
        String out = LogSanitizer.sanitize(input);
        assertThat(out).doesNotContain("first-token-abc")
                .doesNotContain("hunter2")
                .doesNotContain("550e8400-e29b-41d4-a716-446655440000");
    }

    @Test
    void mixedAuthorizationTypesInSameLog_bothMasked() {
        String input = "first req: Authorization: Bearer XXX, second req: Authorization: Basic YYY";
        String out = LogSanitizer.sanitize(input);
        assertThat(out).doesNotContain("XXX").doesNotContain("YYY");
    }

    // ----------------------------------------------------------------- bodies JSON

    @Test
    void jsonBodyWithAccessToken_masked() {
        String body = "{\"access_token\":\"550e8400-e29b-41d4-a716-446655440000\",\"token_type\":\"Bearer\",\"expires_in\":3600}";
        String out = LogSanitizer.sanitize(body);
        // expires_in n'est pas masqué (pas dans la liste sensible).
        assertThat(out).doesNotContain("550e8400-e29b-41d4-a716-446655440000").contains("3600");
    }

    @Test
    void jsonBodyWithClientSecret_masked() {
        String body = "{\"client_id\":\"web_sofinco\",\"client_secret\":\"sup3r-s3cret\"}";
        String out = LogSanitizer.sanitize(body);
        // client_id n'est pas masqué.
        assertThat(out).doesNotContain("sup3r-s3cret").contains("web_sofinco");
    }

    @Test
    void wso2FaultResponseWithToken_uuidMasked() {
        String body = "{\"fault\":{\"code\":\"900901\",\"message\":\"Invalid Credentials for token 550e8400-e29b-41d4-a716-446655440000\"}}";
        String out = LogSanitizer.sanitize(body);
        // Le code d'erreur et le contexte restent visibles.
        assertThat(out).doesNotContain("550e8400-e29b-41d4-a716-446655440000")
                .contains("900901")
                .contains("Invalid Credentials");
    }

    // ----------------------------------------------------------------- combinaisons avec truncate

    @Test
    void safeLog_secretInsideTruncatedZone_stillMasked() {
        // Le secret est avant le point de troncature → doit être masqué.
        String input = "Authorization: Bearer secret-token-abc " + "X".repeat(500);
        String out = LogSanitizer.safeLog(input, 100);
        assertThat(out).doesNotContain("secret-token-abc");
    }

    @Test
    void safeLog_truncateAtZero_returnsTruncatedSuffix() {
        // max=0 → tronque à 0 caractères, ajoute suffixe.
        String out = LogSanitizer.safeLog("any content with password=secret", 0);
        assertThat(out).isEqualTo("...[truncated]");
    }

    // ----------------------------------------------------------------- séparateurs et casse

    /**
     * Un seul motif d'assertion (« la valeur sensible ne ressort pas ») décliné sur les variantes
     * de séparateur et de casse. Le libellé porte l'intention de chaque cas.
     */
    @ParameterizedTest(name = "{0}")
    @MethodSource("sensitiveValues")
    void sensitiveValueIsMasked(String intent, String input, String secret) {
        assertThat(LogSanitizer.sanitize(input)).doesNotContain(secret);
    }

    static Stream<Arguments> sensitiveValues() {
        return Stream.of(
                arguments("séparateur deux-points, valeur entre guillemets (YAML-ish)",
                        "session: \"abc-12345-session\"", "abc-12345-session"),
                arguments("séparateur deux-points, valeur nue",
                        "apikey: my-api-key-xyz", "my-api-key-xyz"),
                arguments("en-tête Authorization en majuscules (regex insensible à la casse)",
                        "AUTHORIZATION: BEARER abc-def-123", "abc-def-123"),
                arguments("UUID en majuscules (regex insensible à la casse)",
                        "uuid=550E8400-E29B-41D4-A716-446655440000 logged",
                        "550E8400-E29B-41D4-A716-446655440000"),
                arguments("UUID sans tirets : masqué par la règle clé/valeur, pas par la règle UUID",
                        "session=550e8400e29b41d4a716446655440000",
                        "550e8400e29b41d4a716446655440000"));
    }

    // ----------------------------------------------------------------- non-string-but-uuid-shaped fragments

    @Test
    void textWithEmbeddedUuid_uuidMasked() {
        String out = LogSanitizer.sanitize("Trace: 550e8400-e29b-41d4-a716-446655440000 was logged.");
        assertThat(out).doesNotContain("550e8400-e29b-41d4-a716-446655440000")
                .contains("Trace:")
                .contains("was logged.");
    }

    @Test
    void notQuiteUuid_notMasked() {
        // Hex de la mauvaise longueur ne ressemble pas à un UUID — ne doit pas être faussement masqué.
        String input = "id 550e8400-e29b-41d4-a716"; // tronqué
        String out = LogSanitizer.sanitize(input);
        assertThat(out).contains("550e8400-e29b-41d4-a716");
    }
}
