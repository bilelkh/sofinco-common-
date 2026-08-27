package ch.sofinco.core.validation.simulation;

import static java.lang.annotation.ElementType.TYPE;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import javax.validation.Constraint;
import javax.validation.Payload;

/**
 * Contrainte de niveau classe : une page qui active l'option « Simulation (exemple représentatif) »
 * doit la renseigner complètement.
 *
 * <p>Portée par {@link SimulationParamsNodeValidator}, liée une seule fois à {@code jnt:page}
 * (cf. {@link SimulationParamsValidatorRegistrar}).
 */
@Target(TYPE)
@Retention(RUNTIME)
@Constraint(validatedBy = SimulationParamsCompleteValidator.class)
@Documented
public @interface SimulationParamsComplete {
    String message() default "Simulation incomplete.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
