package ch.sofinco.core.model.apim;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class CachedTokenTest {

    private static final Instant T0 = Instant.parse("2026-01-01T00:00:00Z");

    @Test
    void from_computesDeadlineMinusSafetyMargin() {
        CachedToken token = CachedToken.from("uuid", T0, 1000, 120);
        // deadline = T0 + (1000 - 120) = T0 + 880s
        assertThat(token.deadline()).isEqualTo(T0.plusSeconds(880));
        assertThat(token.accessToken()).isEqualTo("uuid");
        assertThat(token.obtainedAt()).isEqualTo(T0);
    }

    @Test
    void from_floorsEffectiveTtlToAtLeastOneSecond() {
        // marge supérieure à la durée → deadline = T0 + 1s (planché)
        CachedToken token = CachedToken.from("uuid", T0, 60, 120);
        assertThat(token.deadline()).isEqualTo(T0.plusSeconds(1));
    }

    @Test
    void isStillValid_trueBeforeDeadlineFalseAfter() {
        CachedToken token = CachedToken.from("uuid", T0, 1000, 120);
        assertThat(token.isStillValid(T0.plusSeconds(500))).isTrue();
        assertThat(token.isStillValid(T0.plusSeconds(880))).isFalse();
        assertThat(token.isStillValid(T0.plusSeconds(1000))).isFalse();
    }

    @Test
    void remainingSecondsAt_positiveBeforeDeadlineZeroWhenExpired() {
        CachedToken token = CachedToken.from("uuid", T0, 1000, 120);
        assertThat(token.remainingSecondsAt(T0.plusSeconds(380))).isEqualTo(500);
        assertThat(token.remainingSecondsAt(T0.plusSeconds(900))).isZero();
    }
}
