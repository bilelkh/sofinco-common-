package ch.sofinco.core.bridge;

import org.jahia.services.content.JCRNodeWrapper;

import java.util.List;
import java.util.Map;

/**
 * Contrat OSGi du bridge vers {@code fr.sofinco.portal.jahia.services.ReviewService}.
 *
 * <p>Cette interface est volontairement publiée sous le FQN historique
 * {@code ch.sofinco.core.bridge.ReviewServiceBridge} : le mapping TypeScript de my-template-set
 * (cf. {@code javaBridge.ts}) résout ce service via {@code server.osgi.getService(
 * "ch.sofinco.core.bridge.ReviewServiceBridge")}. Renommer ou déplacer le FQN casserait le
 * binding TS sans erreur de compilation Java.
 *
 * <p>L'implémentation OSGi {@link ReviewServiceBridgeImpl} encapsule le singleton statique
 * {@code ReviewService.getInstance()} de {@code portal-common-sofinco}. Le seam interface permet
 * désormais de mocker en tests sans accrocher le module externe.
 */
public interface ReviewServiceBridge {

    /**
     * Reflète {@code ReviewService.fetchReviews(int, String, int, JCRNodeWrapper)} mais renvoie
     * une liste de {@code Map<String,Object>} JS-friendly à la place d'une liste de
     * {@code JsonNode}.
     *
     * @return liste vide (jamais {@code null}) si le service en amont est indisponible ou répond
     *         avec un payload malformé.
     */
    List<Map<String, Object>> fetchReviews(int nbReview, String product, int minNote, JCRNodeWrapper config);

    /**
     * Reflète {@code ReviewService.getAverageRate(JCRNodeWrapper)} mais renvoie une map plate
     * ({@code average}, {@code nbReview}) au lieu du POJO {@code AverageRate}.
     *
     * @return {@code null} si le service en amont est indisponible, répond malformé, ou échoue
     *         autrement. Le TS interprète déjà {@code null} comme "rating indisponible, sticker
     *         masqué".
     */
    Map<String, Object> getAverageRate(JCRNodeWrapper config);
}
