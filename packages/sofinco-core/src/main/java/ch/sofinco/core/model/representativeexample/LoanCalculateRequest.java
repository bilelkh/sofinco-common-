package ch.sofinco.core.model.representativeexample;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Body de POST /loanSimulation/v3/.../calculate.
 *
 * <p>⚠ Différences vs body CR ({@link RevolvingCalculateRequest}) : {@code amount} est une
 * <b>String</b> (et non un number) et {@code borrower} est au singulier. Tous les champs
 * optionnels sont omis du JSON s'ils sont null ({@link JsonInclude.Include#NON_NULL}).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LoanCalculateRequest(
        @JsonProperty("amount") String amount,
        @JsonProperty("durations") List<Integer> durations,
        @JsonProperty("borrower") Borrower borrower,
        @JsonProperty("coBorrower") Borrower coBorrower,
        @JsonProperty("offerDate") String offerDate,
        @JsonProperty("scaleCode") String scaleCode,
        @JsonProperty("scaleCodes") List<String> scaleCodes,
        @JsonProperty("businessProviderId") String businessProviderId,
        @JsonProperty("equipmentCode") String equipmentCode) {

    /**
     * Construit la requête minimale pour un exemple représentatif PB ou RAC :
     * amount + duration + borrower(hasInsurance=true). Le {@code scaleCode} n'est posé que
     * s'il est non vide (sinon null → omis du JSON).
     *
     * @param amount    montant en euros (string, ex. "10000")
     * @param duration  durée en mois (enveloppée dans {@code durations:[N]})
     * @param scaleCode code barème optionnel
     */
    public static LoanCalculateRequest forExample(String amount, int duration, String scaleCode) {
        String effectiveScaleCode = (scaleCode != null && !scaleCode.isEmpty()) ? scaleCode : null;
        return new LoanCalculateRequest(amount, List.of(duration), Borrower.withInsurance(),
                null, null, effectiveScaleCode, null, null, null);
    }

    /** Builder fluent conservé pour les cas avancés (co-emprunteur, barèmes multiples, etc.). */
    public static final class Builder {
        private String amount;
        private List<Integer> durations;
        private Borrower borrower;
        private Borrower coBorrower;
        private String offerDate;
        private String scaleCode;
        private List<String> scaleCodes;
        private String businessProviderId;
        private String equipmentCode;

        public Builder amount(String v)              { this.amount = v; return this; }
        public Builder durations(List<Integer> v)    { this.durations = v; return this; }
        public Builder borrower(Borrower v)          { this.borrower = v; return this; }
        public Builder coBorrower(Borrower v)        { this.coBorrower = v; return this; }
        public Builder offerDate(String v)           { this.offerDate = v; return this; }
        public Builder scaleCode(String v)           { this.scaleCode = v; return this; }
        public Builder scaleCodes(List<String> v)    { this.scaleCodes = v; return this; }
        public Builder businessProviderId(String v)  { this.businessProviderId = v; return this; }
        public Builder equipmentCode(String v)       { this.equipmentCode = v; return this; }

        public LoanCalculateRequest build() {
            return new LoanCalculateRequest(amount, durations, borrower, coBorrower, offerDate,
                    scaleCode, scaleCodes, businessProviderId, equipmentCode);
        }
    }
}
