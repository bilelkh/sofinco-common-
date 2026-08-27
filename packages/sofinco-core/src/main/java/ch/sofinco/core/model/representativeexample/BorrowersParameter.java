package ch.sofinco.core.model.representativeexample;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Bloc {@code borrowersParameter} (PLURIEL — c'est volontaire dans l'API CR) du body
 * POST /revolvingSimulation/v3/.../calculate.
 *
 * <p>L'API CR exige les 3 champs explicitement, même si {@code insuranceCode} et
 * {@code socioEconomicClassificationCode} sont à empty string — pas null. Le constructeur
 * canonique normalise null → "" pour garantir cette contrainte.
 */
public record BorrowersParameter(
        @JsonProperty("socioEconomicClassificationCode") String socioEconomicClassificationCode,
        @JsonProperty("hasInsurance") boolean hasInsurance,
        @JsonProperty("insuranceCode") String insuranceCode) {

    public BorrowersParameter {
        socioEconomicClassificationCode = socioEconomicClassificationCode != null
                ? socioEconomicClassificationCode : "";
        insuranceCode = insuranceCode != null ? insuranceCode : "";
    }

    public static BorrowersParameter defaultWithInsurance() {
        return new BorrowersParameter("", true, "");
    }
}
