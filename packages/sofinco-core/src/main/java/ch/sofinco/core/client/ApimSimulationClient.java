package ch.sofinco.core.client;

import ch.sofinco.core.exception.ApimException;
import ch.sofinco.core.model.representativeexample.CampaignResponse;
import ch.sofinco.core.model.representativeexample.LoanCalculateResponse;
import ch.sofinco.core.model.representativeexample.RevolvingCalculateResponse;

import java.io.IOException;
import java.util.Optional;

/**
 * Contrat des appels APIM v3 pour les simulations d'exemple représentatif.
 *
 * <p>Strategy pattern via Composite Wrapper :
 * {@code ch.sofinco.core.client.http.HttpApimSimulationClient} et
 * {@code ch.sofinco.core.client.http.MockApimSimulationClient} co-existent,
 * {@link ApimSimulationClientFactory} (seul {@code @Component} OSGi de cette famille) décide
 * laquelle utiliser. Cette approche évite un bug Felix DS « Service factory returned null »
 * qui survient quand une impl {@code @Component} refuse son activation.
 *
 * <h2>Sémantique du retour {@link Optional}</h2>
 *
 * <ul>
 *   <li>{@code Optional.of(response)} — APIM a répondu 2xx avec un body décodable</li>
 *   <li>{@code Optional.empty()} — APIM a répondu non-2xx (4xx/5xx) ou body vide ; l'erreur est
 *       déjà loggée avec correlationId par l'executor sous-jacent</li>
 *   <li>{@link ApimException} — refus fail-closed (HTTPS, config absente) ou auth durablement KO</li>
 *   <li>{@link IOException} — transport (timeout, reset, DNS, parse) ou sérialisation body</li>
 * </ul>
 *
 * <p>Ce contrat typé remplace l'ancien {@code return null} ambigu : l'appelant ne confond plus
 * "APIM a refusé" avec "le client a buggé".
 */
public interface ApimSimulationClient {

    /** Endpoint loan APIM pour PB (Prêt Personnel) ou RAC (Rachat de Crédits). */
    Optional<LoanCalculateResponse> callLoanApi(String sourceCode, long amount, long duration,
                                                String scaleCode, String effectiveOrigin)
            throws ApimException, IOException;

    /** Endpoint revolving APIM pour CR (Crédit Renouvelable). */
    Optional<RevolvingCalculateResponse> callRevolvingApi(String sourceCode, long amount, long duration,
                                                          String effectiveOrigin)
            throws ApimException, IOException;

    /**
     * Enveloppe commerciale d'une provenance : bornes de montant, de durée et de taux.
     *
     * <p>Ni le montant ni la durée n'entrent en jeu — une campagne décrit ce que le produit
     * AUTORISE, pas ce qu'un exemple donné produit. C'est ce qui la rend beaucoup plus partageable
     * que les appels {@code calculate} : une seule réponse par provenance, valable pour toutes les
     * pages qui la référencent.
     *
     * @param sourceCode la provenance (ex. {@code NEOURL41})
     * @param product INDICATION de routage — {@code PB}, {@code CR}, {@code RAC} ou {@code null}.
     *     Les deux racines APIM servent la même ressource ; ce paramètre choisit celle qui
     *     correspond au produit, sans jamais conditionner le résultat. {@code null} retombe sur
     *     la racine dont on a vérifié qu'elle sert TOUTES les campagnes.
     * @param effectiveOrigin en-tête {@code Origin} à présenter à l'APIM
     * @return la campagne, ou {@code Optional.empty()} si l'APIM ne renvoie rien d'exploitable
     */
    Optional<CampaignResponse> callCampaignApi(String sourceCode, String product, String effectiveOrigin)
            throws ApimException, IOException;
}
