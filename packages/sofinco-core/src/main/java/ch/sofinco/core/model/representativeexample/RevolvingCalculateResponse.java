package ch.sofinco.core.model.representativeexample;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Réponse 200 de POST /revolvingSimulation/v3/.../calculate (CR).
 *
 * <p>⚠ L'API CR utilise {@code amountRequested} là où l'API PB/RAC utilise {@code capitalAmount}.
 * On garde le nom Java {@code capitalAmount} (aligné sur PB) avec un {@link JsonAlias}.
 *
 * <p>Les {@code proposals} sont typées {@link RevolvingProposal} (type-safety stricte).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record RevolvingCalculateResponse(
        @JsonProperty("id") String id,
        @JsonProperty("capitalAmount") @JsonAlias({"amountRequested"}) Double capitalAmount,
        @JsonProperty("label") String label,
        @JsonProperty("productCode") String productCode,
        @JsonProperty("campaignCode") @JsonAlias({"campaignId"}) String campaignCode,
        @JsonProperty("proposals") List<RevolvingProposal> proposals) {

    public RevolvingCalculateResponse {
        // Defensive copy : empêche la mutation downstream de la liste injectée par Jackson.
        proposals = proposals != null ? List.copyOf(proposals) : List.of();
    }

    public String productCodeTrimmed() {
        return productCode != null ? productCode.trim() : null;
    }

    public RevolvingProposal firstProposal() {
        return proposals.isEmpty() ? null : proposals.get(0);
    }
}
