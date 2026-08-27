package ch.sofinco.core.model.representativeexample;

import org.jahia.services.content.JCRNodeWrapper;

/**
 * Paramètres d'une demande d'exemple représentatif (param-object).
 *
 * <p>Remplace la liste de 7 arguments primitifs de l'ancienne signature {@code getExample(...)}.
 * Construit par le bridge à partir du child {@code simulator}.
 */
public record SimulationRequest(
        String sourceCode,
        String product,
        Long amount,
        Long duration,
        String scaleCode,
        String requestOrigin,
        JCRNodeWrapper config,
        boolean liveWorkspace) {

    /**
     * Vrai quand le rendu vient du workspace {@code live}.
     *
     * <p>Seul ce cas est mis en cache. L'aperçu et l'édition rendent depuis {@code default} et
     * doivent voir la réponse RÉELLE de l'APIM : c'est la surface sur laquelle le contributeur
     * vérifie ses chiffres avant publication. Lui resservir une valeur mémorisée viderait la
     * vérification de son sens.
     *
     * <p>Aucun enjeu de volume : le cache de fragments de Jahia est lui-même inactif hors live,
     * l'aperçu est donc déjà un chemin non caché de bout en bout.
     */
    public boolean isCacheable() {
        return liveWorkspace;
    }
}
