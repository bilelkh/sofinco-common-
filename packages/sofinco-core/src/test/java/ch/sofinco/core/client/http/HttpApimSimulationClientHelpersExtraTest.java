package ch.sofinco.core.client.http;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Cas adverses additionnels pour les helpers de {@link HttpApimSimulationClient}.
 */
class HttpApimSimulationClientHelpersExtraTest {

    // ----------------------------------------------------------------- safePathSegment

    @Test
    void safePathSegment_rejectsSlashOrColon() {
        assertThatThrownBy(() -> HttpApimSimulationClient.safePathSegment("a/b", "x"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> HttpApimSimulationClient.safePathSegment("a:b", "x"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void safePathSegment_rejectsUrlEncodedCharacters() {
        assertThatThrownBy(() -> HttpApimSimulationClient.safePathSegment("a%20b", "x"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> HttpApimSimulationClient.safePathSegment("a%2Fb", "x"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void safePathSegment_rejectsControlCharacters() {
        assertThatThrownBy(() -> HttpApimSimulationClient.safePathSegment("a\nb", "x"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> HttpApimSimulationClient.safePathSegment("a\rb", "x"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> HttpApimSimulationClient.safePathSegment("a\tb", "x"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void safePathSegment_rejectsUnicodeNonAscii() {
        // Empêche les surprises avec des sourceCodes qui contiendraient des caractères accentués.
        assertThatThrownBy(() -> HttpApimSimulationClient.safePathSegment("café", "x"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void safePathSegment_singleCharAccepted() {
        // [A-Za-z0-9._-]+ accepte un seul caractère.
        assertThat(HttpApimSimulationClient.safePathSegment("a", "x")).isEqualTo("a");
        assertThat(HttpApimSimulationClient.safePathSegment("9", "x")).isEqualTo("9");
        assertThat(HttpApimSimulationClient.safePathSegment("_", "x")).isEqualTo("_");
        assertThat(HttpApimSimulationClient.safePathSegment("-", "x")).isEqualTo("-");
        assertThat(HttpApimSimulationClient.safePathSegment(".", "x")).isEqualTo(".");
    }

    @Test
    void safePathSegment_errorMessageIncludesFieldName() {
        assertThatThrownBy(() -> HttpApimSimulationClient.safePathSegment("../admin", "partnerId"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("partnerId");
    }

    @Test
    void safePathSegment_errorMessageIncludesActualValue() {
        // Le message d'erreur doit donner suffisamment de contexte pour le diagnostic.
        assertThatThrownBy(() -> HttpApimSimulationClient.safePathSegment("with space", "field"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("with space");
    }

    // ----------------------------------------------------------------- safeIntCast

    @Test
    void safeIntCast_atMaxIntBoundary() {
        // Valeurs juste autour de Integer.MAX_VALUE.
        long maxInt = Integer.MAX_VALUE;
        assertThat(HttpApimSimulationClient.safeIntCast(maxInt, "x")).isEqualTo(Integer.MAX_VALUE);
        assertThat(HttpApimSimulationClient.safeIntCast(maxInt - 1L, "x")).isEqualTo(Integer.MAX_VALUE - 1);

        assertThatThrownBy(() -> HttpApimSimulationClient.safeIntCast(maxInt + 1L, "x"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> HttpApimSimulationClient.safeIntCast(Long.MAX_VALUE, "x"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void safeIntCast_rejectsMinValueAndNegative() {
        assertThatThrownBy(() -> HttpApimSimulationClient.safeIntCast(Long.MIN_VALUE, "x"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> HttpApimSimulationClient.safeIntCast(-1L, "x"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void safeIntCast_errorMessageIncludesFieldNameAndValue() {
        assertThatThrownBy(() -> HttpApimSimulationClient.safeIntCast(-5L, "duration"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("duration")
                .hasMessageContaining("-5");
    }

    // ----------------------------------------------------------------- validateAmountAndDuration

    @Test
    void validateAmountAndDuration_acceptsTypicalValues() {
        // Valeurs représentatives PB/RAC/CR : ne doivent pas lever.
        HttpApimSimulationClient.validateAmountAndDuration(1000L, 12L);
        HttpApimSimulationClient.validateAmountAndDuration(15000L, 48L);
        HttpApimSimulationClient.validateAmountAndDuration(3000L, 36L);
        HttpApimSimulationClient.validateAmountAndDuration(1L, 1L);
        HttpApimSimulationClient.validateAmountAndDuration(Long.MAX_VALUE, Long.MAX_VALUE);
    }

    @Test
    void validateAmountAndDuration_amountErrorIncludesValue() {
        assertThatThrownBy(() -> HttpApimSimulationClient.validateAmountAndDuration(-100L, 36L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("-100");
    }
}
