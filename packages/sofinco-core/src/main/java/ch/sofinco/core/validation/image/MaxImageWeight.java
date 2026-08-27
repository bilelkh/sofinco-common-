package ch.sofinco.core.validation.image;

import static java.lang.annotation.ElementType.TYPE;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import javax.validation.Constraint;
import javax.validation.Payload;

/**
 * Contrainte de niveau classe : contrôle le poids de TOUTES les images référencées par un contenu.
 * Portée par {@link ImageWeightNodeValidator}, liée une seule fois à jnt:content (OSGi DS).
 */
@Target(TYPE)
@Retention(RUNTIME)
@Constraint(validatedBy = MaxImageWeightValidator.class)
@Documented
public @interface MaxImageWeight {
    String message() default "Image trop lourde.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
