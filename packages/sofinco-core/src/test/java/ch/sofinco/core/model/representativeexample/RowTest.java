package ch.sofinco.core.model.representativeexample;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RowTest {

    @Test
    void simpleConstructorDefaults() {
        Row r = new Row("label.key", "344,03 €");
        assertThat(r.labelKey()).isEqualTo("label.key");
        assertThat(r.value()).isEqualTo("344,03 €");
        assertThat(r.highlighted()).isFalse();
        assertThat(r.labelParam()).isNull();
    }

    @Test
    void highlightedFactory() {
        Row r = Row.highlighted("total", "16 513,44 €");
        assertThat(r.highlighted()).isTrue();
        assertThat(r.labelParam()).isNull();
    }

    @Test
    void parameterizedFactory() {
        Row r = Row.parameterized("duration", "48 mois", "48");
        assertThat(r.highlighted()).isFalse();
        assertThat(r.labelParam()).isEqualTo("48");
        assertThat(r.value()).isEqualTo("48 mois");
    }

    @Test
    void fullConstructor() {
        Row r = new Row("k", "v", true, "p");
        assertThat(r.labelKey()).isEqualTo("k");
        assertThat(r.value()).isEqualTo("v");
        assertThat(r.highlighted()).isTrue();
        assertThat(r.labelParam()).isEqualTo("p");
    }
}
