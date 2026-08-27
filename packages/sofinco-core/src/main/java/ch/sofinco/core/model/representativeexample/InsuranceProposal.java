package ch.sofinco.core.model.representativeexample;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Proposition d'assurance attachée à un {@link CommonProposal}.
 *
 * <p>Le champ {@code insuranceProducts} (souvent null pour les exemples représentatifs
 * anonymes, peuplé pour les vraies simulations) est typé {@code Object} pour rester flexible.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record InsuranceProposal(
        @JsonProperty("insuranceCode") String insuranceCode,
        @JsonProperty("insuranceInstallment") Installment insuranceInstallment,
        @JsonProperty("totalInsuranceCost") Double totalInsuranceCost,
        @JsonProperty("insuranceProducts") Object insuranceProducts) {
}
