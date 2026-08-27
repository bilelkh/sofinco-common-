package ch.sofinco.core.observability;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Le contrat {@link MetricsRecorder#NOOP} doit accepter toute entrée sans lever d'exception,
 * y compris les cas pathologiques (name blank, tags impairs, tags null). Le path observabilité
 * ne doit jamais casser le path métier.
 */
class MetricsRecorderTest {

    @Test
    void noop_acceptsAnyInputWithoutThrowing() {
        assertThatCode(() -> MetricsRecorder.NOOP.increment("any.metric")).doesNotThrowAnyException();
        assertThatCode(() -> MetricsRecorder.NOOP.increment("any.metric", "k", "v")).doesNotThrowAnyException();
        assertThatCode(() -> MetricsRecorder.NOOP.increment("", "odd")).doesNotThrowAnyException();
        assertThatCode(() -> MetricsRecorder.NOOP.increment(null)).doesNotThrowAnyException();
    }
}
