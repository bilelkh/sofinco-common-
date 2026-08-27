package ch.sofinco.core.exception;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ApimExceptionTest {

    @Test
    void messageConstructor() {
        ApimException e = new ApimException("boom");
        assertThat(e.getMessage()).isEqualTo("boom");
        assertThat(e.getCause()).isNull();
    }

    @Test
    void messageAndCauseConstructor() {
        Throwable cause = new IllegalStateException("root");
        ApimException e = new ApimException("boom", cause);
        assertThat(e.getMessage()).isEqualTo("boom");
        assertThat(e.getCause()).isSameAs(cause);
    }
}
