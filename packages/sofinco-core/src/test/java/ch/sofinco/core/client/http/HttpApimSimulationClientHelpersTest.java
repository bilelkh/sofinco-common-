package ch.sofinco.core.client.http;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests des helpers de validation amont (P0.3). Couverture des cas adverses :
 * caractères de path manipulation, overflow long → int.
 */
class HttpApimSimulationClientHelpersTest {

    @Test
    void safePathSegment_acceptsAlphanumericAndDotDashUnderscore() {
        assertThat(HttpApimSimulationClient.safePathSegment("NEOURL14", "sourceCode")).isEqualTo("NEOURL14");
        assertThat(HttpApimSimulationClient.safePathSegment("web_sofinco", "partnerId")).isEqualTo("web_sofinco");
        assertThat(HttpApimSimulationClient.safePathSegment("v3.1", "x")).isEqualTo("v3.1");
        assertThat(HttpApimSimulationClient.safePathSegment("a-b-c", "x")).isEqualTo("a-b-c");
    }

    @Test
    void safePathSegment_rejectsPathManipulation() {
        assertThatThrownBy(() -> HttpApimSimulationClient.safePathSegment("../v2/admin", "sourceCode"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sourceCode");
        assertThatThrownBy(() -> HttpApimSimulationClient.safePathSegment("x/../..", "partnerId"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> HttpApimSimulationClient.safePathSegment("with space", "x"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> HttpApimSimulationClient.safePathSegment("x?y=1", "x"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void safePathSegment_rejectsNullOrEmpty() {
        assertThatThrownBy(() -> HttpApimSimulationClient.safePathSegment(null, "field"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> HttpApimSimulationClient.safePathSegment("", "field"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void safeIntCast_acceptsInRangeValues() {
        assertThat(HttpApimSimulationClient.safeIntCast(1L, "duration")).isEqualTo(1);
        assertThat(HttpApimSimulationClient.safeIntCast(36L, "duration")).isEqualTo(36);
        assertThat(HttpApimSimulationClient.safeIntCast((long) Integer.MAX_VALUE, "duration"))
                .isEqualTo(Integer.MAX_VALUE);
    }

    @Test
    void safeIntCast_rejectsOutOfRange() {
        assertThatThrownBy(() -> HttpApimSimulationClient.safeIntCast(0L, "duration"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> HttpApimSimulationClient.safeIntCast(-1L, "duration"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> HttpApimSimulationClient.safeIntCast((long) Integer.MAX_VALUE + 1L, "duration"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void validateAmountAndDuration_rejectsZeroOrNegative() {
        assertThatThrownBy(() -> HttpApimSimulationClient.validateAmountAndDuration(0L, 36L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("amount");
        assertThatThrownBy(() -> HttpApimSimulationClient.validateAmountAndDuration(-100L, 36L))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> HttpApimSimulationClient.validateAmountAndDuration(3000L, 0L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("duration");
    }
}
