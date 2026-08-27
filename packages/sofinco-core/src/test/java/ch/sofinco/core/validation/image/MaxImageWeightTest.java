package ch.sofinco.core.validation.image;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

import javax.validation.Constraint;

import org.junit.jupiter.api.Test;

/**
 * Tests unitaires de la contrainte de niveau classe {@link MaxImageWeight} :
 * garantit son câblage (validateur associé, portée runtime, valeurs par défaut).
 */
class MaxImageWeightTest {

    @Test
    void isWiredToMaxImageWeightValidator() {
        Constraint constraint = MaxImageWeight.class.getAnnotation(Constraint.class);

        assertThat(constraint).isNotNull();
        assertThat(constraint.validatedBy()).containsExactly(MaxImageWeightValidator.class);
    }

    @Test
    void isRetainedAtRuntime() {
        Retention retention = MaxImageWeight.class.getAnnotation(Retention.class);

        assertThat(retention).isNotNull();
        assertThat(retention.value()).isEqualTo(RetentionPolicy.RUNTIME);
    }

    @Test
    void exposesTheBeanValidationDefaults() throws Exception {
        assertThat(MaxImageWeight.class.getMethod("message").getDefaultValue())
                .isEqualTo("Image trop lourde.");
        assertThat((Class<?>[]) MaxImageWeight.class.getMethod("groups").getDefaultValue())
                .isEmpty();
        assertThat((Class<?>[]) MaxImageWeight.class.getMethod("payload").getDefaultValue())
                .isEmpty();
    }
}
