package ch.sofinco.core.exception;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Garantit que l'enum {@link ApimErrorKind} couvre toutes les catégories nommées et que
 * {@link ApimException} préserve correctement la valeur (et fallback sur {@code UNSPECIFIED}
 * pour les constructeurs legacy).
 */
class ApimErrorKindTest {

    @Test
    void enum_containsAllExpectedKinds() {
        assertThat(ApimErrorKind.values()).contains(
                ApimErrorKind.UNSPECIFIED,
                ApimErrorKind.SERVICE_NOT_ACTIVATED,
                ApimErrorKind.CONFIG_MISSING,
                ApimErrorKind.HTTP_CLIENT_UNAVAILABLE,
                ApimErrorKind.INSECURE_TRANSPORT,
                ApimErrorKind.TOKEN_FETCH_FAILED,
                ApimErrorKind.AUTH_REJECTED,
                ApimErrorKind.CLIENT_ERROR,
                ApimErrorKind.SERVER_ERROR,
                ApimErrorKind.TRANSPORT_ERROR,
                ApimErrorKind.RESPONSE_PARSE_ERROR);
    }

    @Test
    void legacyConstructors_defaultToUnspecified() {
        assertThat(new ApimException("boom").kind()).isEqualTo(ApimErrorKind.UNSPECIFIED);
        assertThat(new ApimException("boom", new RuntimeException("root")).kind())
                .isEqualTo(ApimErrorKind.UNSPECIFIED);
    }

    @Test
    void typedConstructor_preservesKind() {
        ApimException e = new ApimException(ApimErrorKind.AUTH_REJECTED, "401 final");
        assertThat(e.kind()).isEqualTo(ApimErrorKind.AUTH_REJECTED);
        assertThat(e.getMessage()).isEqualTo("401 final");
    }

    @Test
    void nullKind_normalizesToUnspecified() {
        ApimException e = new ApimException(null, "boom", null);
        assertThat(e.kind()).isEqualTo(ApimErrorKind.UNSPECIFIED);
    }
}
