package ch.sofinco.core.model.representativeexample;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Proposition de simulation pour l'endpoint revolving (CR) — {@code POST /revolvingSimulation/v3}.
 *
 * <p>Spécifique revolving : pas de {@code contractFees} (structurellement 0,00 € pour le CR).
 * Implémente {@link CommonProposal} pour partager les champs communs (taux, assurance,
 * échéancier) avec {@link LoanProposal} via un type commun.
 *
 * <p>Les {@link JsonAlias} acceptent le nommage CR brut (ex. {@code creditDuration},
 * {@code totalDueAmountWithoutInsurance}, {@code deferralMonthNumber}, {@code isFixedRate})
 * tout en gardant les noms PB en champ principal.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record RevolvingProposal(
        @JsonProperty("loanDuration") @JsonAlias({"creditDuration"}) Integer loanDuration,
        @JsonProperty("dueNumber") Integer dueNumber,
        @JsonProperty("dueDeferralNumber") @JsonAlias({"deferralMonthNumber"}) Integer dueDeferralNumber,
        @JsonProperty("scaleCode") String scaleCode,
        @JsonProperty("annualDebitRate") Double annualDebitRate,
        @JsonProperty("annualGlobalEffectiveRate") Double annualGlobalEffectiveRate,
        @JsonProperty("annualChargeRate") Double annualChargeRate,
        @JsonProperty("annualInsuranceEffectiveRate") Double annualInsuranceEffectiveRate,
        @JsonProperty("totalCostWithoutInsurance") Double totalCostWithoutInsurance,
        @JsonProperty("totalCostWithInsurance") Double totalCostWithInsurance,
        @JsonProperty("totalCostWithInsuranceAndServices") Double totalCostWithInsuranceAndServices,
        @JsonProperty("fixedRate") @JsonAlias({"isFixedRate"}) Boolean fixedRate,
        @JsonProperty("totalAmountWithoutInsurance") @JsonAlias({"totalDueAmountWithoutInsurance"}) Double totalAmountWithoutInsurance,
        @JsonProperty("totalAmountWithInsurance") @JsonAlias({"totalDueAmountWithInsurance"}) Double totalAmountWithInsurance,
        @JsonProperty("overdraftChargesAmount") Double overdraftChargesAmount,
        @JsonProperty("personInsuranceTotalAmount") Double personInsuranceTotalAmount,
        @JsonProperty("installmentWithoutInsurance") Installment installmentWithoutInsurance,
        @JsonProperty("installmentWithInsurance") Installment installmentWithInsurance,
        @JsonProperty("hasBorrowerInsurance") Boolean hasBorrowerInsurance,
        @JsonProperty("hasCoBorrowerInsurance") Boolean hasCoBorrowerInsurance,
        @JsonProperty("borrowerInsurance") InsuranceProposal borrowerInsurance,
        @JsonProperty("coBorrowerInsurance") InsuranceProposal coBorrowerInsurance,
        @JsonProperty("alternativeBorrowerInsurance") List<InsuranceProposal> alternativeBorrowerInsurance,
        @JsonProperty("alternativeCoBorrowerInsurance") List<InsuranceProposal> alternativeCoBorrowerInsurance,
        @JsonProperty("maxProposal") RevolvingProposal maxProposal) implements CommonProposal {

    public RevolvingProposal {
        // Defensive copy : immutabilité réelle des records, anti-mutation downstream.
        alternativeBorrowerInsurance = alternativeBorrowerInsurance != null
                ? List.copyOf(alternativeBorrowerInsurance) : List.of();
        alternativeCoBorrowerInsurance = alternativeCoBorrowerInsurance != null
                ? List.copyOf(alternativeCoBorrowerInsurance) : List.of();
    }
}
