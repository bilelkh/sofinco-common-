package ch.sofinco.core.model.representativeexample;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Proposition de simulation pour les endpoints loan (PB / RAC) — {@code POST /loanSimulation/v3}.
 *
 * <p>Spécifique loan : {@link #contractFees()} (frais de dossier). Implémente
 * {@link CommonProposal} pour partager les champs communs (taux, assurance, échéancier) avec
 * {@link RevolvingProposal} via un type commun.
 *
 * <p>⚠ <b>L'API APIM utilise un nommage différent entre les endpoints PB/RAC (Loan) et CR
 * (Revolving) pour les mêmes données logiques.</b> Les {@link JsonAlias} ci-dessous gèrent
 * les deux nomenclatures sur un seul type, en gardant les noms PB comme principaux :
 * <ul>
 *   <li>Durée : {@code loanDuration} (PB) ↔ {@code creditDuration} (CR)</li>
 *   <li>Total dû (sans assu) : {@code totalAmountWithoutInsurance} ↔ {@code totalDueAmountWithoutInsurance}</li>
 *   <li>Total dû (avec assu) : {@code totalAmountWithInsurance} ↔ {@code totalDueAmountWithInsurance}</li>
 *   <li>Différé : {@code dueDeferralNumber} ↔ {@code deferralMonthNumber}</li>
 *   <li>Taux fixe ? : {@code fixedRate} ↔ {@code isFixedRate}</li>
 * </ul>
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record LoanProposal(
        @JsonProperty("loanDuration") @JsonAlias({"creditDuration"}) Integer loanDuration,
        @JsonProperty("dueNumber") Integer dueNumber,
        @JsonProperty("dueDeferralNumber") @JsonAlias({"deferralMonthNumber"}) Integer dueDeferralNumber,
        @JsonProperty("scaleCode") String scaleCode,
        @JsonProperty("annualDebitRate") Double annualDebitRate,
        @JsonProperty("annualGlobalEffectiveRate") Double annualGlobalEffectiveRate,
        @JsonProperty("annualChargeRate") Double annualChargeRate,
        @JsonProperty("annualInsuranceEffectiveRate") Double annualInsuranceEffectiveRate,
        @JsonProperty("contractFees") Double contractFees,
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
        @JsonProperty("maxProposal") LoanProposal maxProposal) implements CommonProposal {

    public LoanProposal {
        // Defensive copy : Jackson injecte des ArrayList ; on les fige pour préserver l'immutabilité
        // contractuelle du record et empêcher toute mutation accidentelle côté consommateur.
        alternativeBorrowerInsurance = alternativeBorrowerInsurance != null
                ? List.copyOf(alternativeBorrowerInsurance) : List.of();
        alternativeCoBorrowerInsurance = alternativeCoBorrowerInsurance != null
                ? List.copyOf(alternativeCoBorrowerInsurance) : List.of();
    }
}
