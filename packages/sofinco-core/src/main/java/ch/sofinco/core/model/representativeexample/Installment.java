package ch.sofinco.core.model.representativeexample;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Échéancier d'une proposition (loan ou revolving).
 *
 * <p>Exemple JSON observé en recette :
 * <pre>{@code
 *   { "amount": 344.03, "firstAmount": 344.03, "lastAmount": 344.03,
 *     "totalDueNumber": 48, "dueNumber": 48 }
 * }</pre>
 *
 * <p>⚠ Dans {@link LoanProposal} / {@link RevolvingProposal}, {@code installmentWithInsurance} et
 * {@code installmentWithoutInsurance} sont des <b>objets uniques</b> (Installment), pas des
 * arrays : le Swagger v3 disait array mais la vraie réponse APIM renvoie un objet seul.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record Installment(
        @JsonProperty("amount") Double amount,
        @JsonProperty("firstAmount") Double firstAmount,
        @JsonProperty("lastAmount") Double lastAmount,
        @JsonProperty("totalDueNumber") Integer totalDueNumber,
        @JsonProperty("dueNumber") Integer dueNumber) {
}
