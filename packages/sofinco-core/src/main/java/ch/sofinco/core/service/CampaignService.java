package ch.sofinco.core.service;

import ch.sofinco.core.model.representativeexample.CampaignResponse;

import java.util.Optional;

/**
 * Enveloppe commerciale d'une provenance : bornes de montant, de durée et de taux.
 *
 * <p>Service distinct de {@link RepresentativeExampleService}, et non une méthode de plus sur
 * lui, parce que les deux ne partagent ni leurs préconditions, ni leur clé de cache, ni leur
 * rythme de péremption :
 *
 * <ul>
 *   <li>un exemple représentatif dépend du produit, du montant et de la durée — il change à chaque
 *       configuration de page ;
 *   <li>une campagne ne dépend que de la provenance — elle change quand le marketing révise un
 *       barème, soit quelques fois par an.
 * </ul>
 *
 * <p>Les fusionner imposerait à une page n'affichant qu'un {@code {minAmount}} de déclencher une
 * simulation complète, et forcerait une seule fenêtre de fraîcheur sur deux régimes sans rapport.
 *
 * <p><b>Contrat de frontière.</b> Aucune méthode ne lève : ce service est consommé depuis le moteur
 * JavaScript de Jahia, où une exception ne dégrade pas le fragment mais casse la page entière.
 * L'absence de résultat s'exprime par un {@link Optional} vide.
 */
public interface CampaignService {

    /**
     * Campagne associée à une provenance.
     *
     * @param sourceId la provenance (ex. {@code NEOURL41}) ; {@code null} ou vide renvoie vide
     * @param product INDICATION de routage APIM — {@code PB}, {@code CR}, {@code RAC} ou
     *     {@code null}. N'entre PAS dans la clé de cache : les deux racines servent la même
     *     campagne, une provenance donnée a donc une seule réponse quel que soit le produit.
     * @param requestOrigin en-tête {@code Origin} de la requête entrante, ou {@code null}
     * @return la campagne, ou {@link Optional#empty()} si elle est indisponible
     */
    Optional<CampaignResponse> getCampaign(String sourceId, String product, String requestOrigin);
}
