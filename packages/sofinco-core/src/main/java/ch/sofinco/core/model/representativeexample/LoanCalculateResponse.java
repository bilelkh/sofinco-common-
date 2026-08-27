package ch.sofinco.core.model.representativeexample;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Réponse 200 de POST /loanSimulation/v3/.../calculate (PB / RAC).
 *
 * <p>⚠ Le champ retourné est {@code campaignCode} (et non {@code campaignId} comme dans le
 * Swagger) — {@link JsonAlias} accepte les deux. {@code productCode} peut contenir un padding
 * d'espace (ex. "PBPERSO ") ; {@link #productCodeTrimmed()} retourne la version trimmée.
 *
 * <p>Les {@code proposals} sont typées {@link LoanProposal} (sealed type-safety) : le compilateur
 * empêche de lire un champ revolving (ex. absence de {@code contractFees}) depuis ce DTO.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record LoanCalculateResponse(
        @JsonProperty("id") String id,
        @JsonProperty("capitalAmount") Double capitalAmount,
        @JsonProperty("label") String label,
        @JsonProperty("productCode") String productCode,
        @JsonProperty("campaignCode") @JsonAlias({"campaignId"}) String campaignCode,
        @JsonProperty("proposals") List<LoanProposal> proposals) {

    public LoanCalculateResponse {
        // Defensive copy : Jackson injecte des ArrayList mutables, on les fige en List immutable
        // pour empêcher tout muté côté consommateur (record contract = vraie immutabilité).
        proposals = proposals != null ? List.copyOf(proposals) : List.of();
    }

    /** Retourne le productCode sans padding d'espace (ex. "PBPERSO" au lieu de "PBPERSO "). */
    public String productCodeTrimmed() {
        return productCode != null ? productCode.trim() : null;
    }

    /** Première proposition (celle utilisée pour l'exemple représentatif), ou null si aucune. */
    public LoanProposal firstProposal() {
        return proposals.isEmpty() ? null : proposals.get(0);
    }
}
