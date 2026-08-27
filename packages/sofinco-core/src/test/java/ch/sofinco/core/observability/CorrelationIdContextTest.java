package ch.sofinco.core.observability;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Vérifie l'invariant clé du scope MDC : un correlationId est posé pendant le scope,
 * la valeur antérieure (le cas échéant) est restaurée à la fermeture, et les scopes imbriqués
 * s'empilent proprement.
 */
class CorrelationIdContextTest {

    @AfterEach
    void clear() {
        MDC.remove(CorrelationIdContext.MDC_KEY);
    }

    @Test
    void open_setsAndRemovesMdcKey() {
        assertThat(MDC.get(CorrelationIdContext.MDC_KEY)).isNull();
        try (CorrelationIdContext.Scope s = CorrelationIdContext.open()) {
            assertThat(MDC.get(CorrelationIdContext.MDC_KEY)).isNotBlank();
            assertThat(s.correlationId()).isEqualTo(MDC.get(CorrelationIdContext.MDC_KEY));
        }
        assertThat(MDC.get(CorrelationIdContext.MDC_KEY)).isNull();
    }

    @Test
    void openWith_usesGivenIdAndFallsBackToFreshOnBlank() {
        try (CorrelationIdContext.Scope s = CorrelationIdContext.openWith("abc-123")) {
            assertThat(s.correlationId()).isEqualTo("abc-123");
            assertThat(MDC.get(CorrelationIdContext.MDC_KEY)).isEqualTo("abc-123");
        }
        try (CorrelationIdContext.Scope s = CorrelationIdContext.openWith("  ")) {
            assertThat(s.correlationId()).isNotBlank();
        }
    }

    @Test
    void nestedScopes_restorePreviousValueOnClose() {
        try (CorrelationIdContext.Scope outer = CorrelationIdContext.openWith("outer")) {
            try (CorrelationIdContext.Scope inner = CorrelationIdContext.openWith("inner")) {
                assertThat(MDC.get(CorrelationIdContext.MDC_KEY)).isEqualTo("inner");
                assertThat(inner.correlationId()).isEqualTo("inner");
            }
            assertThat(MDC.get(CorrelationIdContext.MDC_KEY)).isEqualTo("outer");
        }
        assertThat(MDC.get(CorrelationIdContext.MDC_KEY)).isNull();
    }

    @Test
    void close_isIdempotent() {
        CorrelationIdContext.Scope s = CorrelationIdContext.open();
        s.close();
        s.close(); // ne doit pas relancer la restauration une 2e fois
        assertThat(MDC.get(CorrelationIdContext.MDC_KEY)).isNull();
    }

    @Test
    void current_returnsValueDuringScope() {
        assertThat(CorrelationIdContext.current()).isNull();
        try (CorrelationIdContext.Scope ignored = CorrelationIdContext.openWith("id-42")) {
            assertThat(CorrelationIdContext.current()).isEqualTo("id-42");
        }
    }
}
