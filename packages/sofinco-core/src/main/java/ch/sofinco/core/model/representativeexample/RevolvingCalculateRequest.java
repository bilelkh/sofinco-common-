package ch.sofinco.core.model.representativeexample;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Body de POST /revolvingSimulation/v3/.../calculate.
 *
 * <p>⚠ Différences vs {@link LoanCalculateRequest} :
 * <ul>
 *   <li>{@code amount} est un <b>number</b> (long)</li>
 *   <li>{@code borrowersParameter} au pluriel (loan utilise {@code borrower} singulier)</li>
 * </ul>
 */
public record RevolvingCalculateRequest(
        @JsonProperty("amount") long amount,
        @JsonProperty("durations") List<Integer> durations,
        @JsonProperty("borrowersParameter") BorrowersParameter borrowersParameter) {

    public static RevolvingCalculateRequest forExample(long amount, int duration) {
        return new RevolvingCalculateRequest(
                amount, List.of(duration), BorrowersParameter.defaultWithInsurance());
    }
}
