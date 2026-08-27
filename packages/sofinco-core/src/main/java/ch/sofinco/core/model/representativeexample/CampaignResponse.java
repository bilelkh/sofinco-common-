package ch.sofinco.core.model.representativeexample;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Réponse 200 de {@code GET /revolvingSimulation/v3/partners/{partnerId}/campaigns/{sourceId}}.
 *
 * <p>Décrit l'ENVELOPPE COMMERCIALE d'une offre — bornes de montant, de durée et de taux — par
 * opposition aux réponses {@code calculate}, qui décrivent UN exemple calculé. C'est ce qui permet
 * à une mention légale d'annoncer « un TAEG fixe de 4,4 % à 15,65 % » sans qu'un contributeur ait
 * à ressaisir ces bornes à chaque changement de barème.
 *
 * <p><b>Les DEUX racines APIM servent l'intégralité des campagnes</b>, vérifié en production dans
 * les deux sens : {@code NEOURL41} ({@code "type": "loan"}) et {@code NEOURL02}
 * ({@code "type": "revolving"}) répondent en 200 sous {@code loanSimulation/v3} comme sous
 * {@code revolvingSimulation/v3}. La ressource {@code campaigns} est manifestement un service
 * unique exposé sous deux préfixes, sans URL canonique.
 *
 * <p>Le produit ne conditionne donc PAS le résultat. {@code campaignPathTemplate} l'utilise
 * néanmoins pour choisir la racine cohérente avec l'endpoint {@code calculate} correspondant :
 * cela aligne les chemins et met le module à l'abri si la passerelle venait à restreindre une
 * racine à sa propre famille.
 *
 * <p>{@code id}, {@code type} et {@code label} sont désérialisés mais volontairement NON exposés
 * comme variables de contribution : les deux premiers sont techniques, et {@code label} est un nom
 * trop générique pour un espace de jetons partagé avec d'autres moteurs de gabarit.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CampaignResponse(
        @JsonProperty("id") String id,
        @JsonProperty("type") String type,
        @JsonProperty("label") String label,
        @JsonProperty("minAmount") Double minAmount,
        @JsonProperty("maxAmount") Double maxAmount,
        @JsonProperty("minDuration") Integer minDuration,
        @JsonProperty("maxDuration") Integer maxDuration,
        @JsonProperty("minAnnualDebitRate") Double minAnnualDebitRate,
        @JsonProperty("maxAnnualDebitRate") Double maxAnnualDebitRate,
        @JsonProperty("minAnnualGlobalEffectiveRate") Double minAnnualGlobalEffectiveRate,
        @JsonProperty("maxAnnualGlobalEffectiveRate") Double maxAnnualGlobalEffectiveRate,
        @JsonProperty("promoGlobalEffectiveRate") Double promoGlobalEffectiveRate,
        @JsonProperty("startDate") String startDate,
        @JsonProperty("endDate") String endDate) {
}
