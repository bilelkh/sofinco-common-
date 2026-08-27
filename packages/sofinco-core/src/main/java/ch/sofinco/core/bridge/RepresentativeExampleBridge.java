package ch.sofinco.core.bridge;

import org.jahia.services.content.JCRNodeWrapper;

import java.util.Map;

/**
 * Bridge OSGi consommé par le mapping TypeScript de {@code packages/template-set}.
 *
 * <p>Côté TS, le service est récupéré par :
 * <pre>{@code
 *   server.osgi.getService("ch.sofinco.core.bridge.RepresentativeExampleBridge")
 * }</pre>
 *
 * <p>Le bridge fait l'adaptation entre le domaine métier Java (record
 * {@code RepresentativeExample} typé fortement) et le format consommable par JavaScript
 * (Map de clés/valeurs primitives).
 *
 * <p>Il lit lui-même les propriétés <b>à plat</b> sur le node reçu — le TS reste simple
 * ({@code bridge.getExample(node)}) sans gérer la traversée JCR.
 *
 * <h2>Deux origines possibles pour les paramètres</h2>
 * <p>Le node accepté peut être :
 * <ul>
 *   <li>une <b>PAGE</b> portant {@code sofmix:simulationParams} → {@code simProduct},
 *       {@code simSourceId}, {@code simAmount}, {@code simDuration}, {@code simScaleCode}.
 *       C'est la forme cible : un exemple représentatif décrit une offre sur une page, pas un
 *       bloc, et les valeurs deviennent consommables par tous les composants de la page ;</li>
 *   <li>le node du composant {@code sofnt:representativeExample} → {@code product},
 *       {@code sourceId} (mixin {@code sofmix:simulatorCta}), {@code amount}, {@code dueNumber},
 *       {@code scaleCode} (natifs). Forme héritée, conservée le temps que la migration
 *       {@code migrate-simulation-params-to-page.groovy} soit rejouée et vérifiée.</li>
 * </ul>
 * <p>Les deux jeux de noms ne coexistent jamais sur un même node : celui qui répond gagne.
 */
public interface RepresentativeExampleBridge {

    /**
     * Calcule et retourne l'exemple représentatif pour le node donné.
     *
     * @param componentNode une PAGE portant {@code sofmix:simulationParams}, ou le node d'un
     *                      composant {@code sofnt:representativeExample} (cf. javadoc de classe)
     * @return une Map consommable côté TS, ou {@code null} si l'exemple n'a pas pu être calculé
     *         (paramètres incomplets, config absente, APIM indisponible…)
     */
    Map<String, Object> getExample(JCRNodeWrapper componentNode);
}
