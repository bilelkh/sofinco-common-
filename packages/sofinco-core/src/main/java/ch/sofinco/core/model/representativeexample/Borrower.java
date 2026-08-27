package ch.sofinco.core.model.representativeexample;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Bloc {@code borrower} (singulier) du body POST /loanSimulation/v3/.../calculate.
 *
 * <p>Diffère du bloc CR équivalent {@link BorrowersParameter} (au pluriel). Pour un exemple
 * représentatif anonyme, on n'envoie typiquement que {@code hasInsurance=true} ; les autres
 * champs restent null et {@link JsonInclude.Include#NON_NULL} les omet du JSON émis.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record Borrower(
        @JsonProperty("hasInsurance") Boolean hasInsurance,
        @JsonProperty("birthDate") String birthDate,
        @JsonProperty("socioEconomicClassificationCode") String socioEconomicClassificationCode,
        @JsonProperty("insuranceCode") String insuranceCode,
        @JsonProperty("retrieveAlternativeInsurances") Boolean retrieveAlternativeInsurances) {

    /** Emprunteur minimal pour un exemple représentatif : assurance activée uniquement. */
    public static Borrower withInsurance() {
        return new Borrower(Boolean.TRUE, null, null, null, null);
    }
}
