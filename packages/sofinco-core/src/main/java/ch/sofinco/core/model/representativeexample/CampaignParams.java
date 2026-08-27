package ch.sofinco.core.model.representativeexample;

import ch.sofinco.core.util.JcrReads;
import org.jahia.services.content.JCRNodeWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.RepositoryException;

/**
 * Provenance de campagne portée par une PAGE, via le même mixin {@code sofmix:simulationParams}.
 *
 * <p><b>Pourquoi un record distinct de {@link SimulationParams}.</b> Les deux familles de variables
 * n'ont pas les mêmes préconditions :
 *
 * <ul>
 *   <li>une SIMULATION exige le type de crédit, le montant et la durée — elle calcule un exemple ;
 *   <li>une CAMPAGNE n'exige que la provenance — elle décrit l'enveloppe commerciale du produit
 *       (bornes de montant, de durée, de taux), indépendamment de tout exemple.
 * </ul>
 *
 * <p>Confondre les deux obligerait un contributeur qui ne veut afficher qu'un {@code {minAmount}} à
 * renseigner un type de crédit qu'il n'utilise pas. Or {@code simProduct} détermine des chiffres
 * RÉGLEMENTÉS et n'a volontairement pas de défaut : lui faire choisir une valeur au hasard pour
 * débloquer un affichage sans rapport serait exactement l'erreur que le CND cherche à empêcher.
 *
 * <p>Record immuable, lu par {@code SimulationPrepareFilter} et
 * {@code SimulationCacheKeyPartGenerator} — les deux voient nécessairement la même chose.
 */
public record CampaignParams(String sourceId) {

    private static final Logger LOG = LoggerFactory.getLogger(CampaignParams.class);

    /**
     * Lit la provenance d'une page.
     *
     * @param page le nœud page, ou {@code null}
     * @return la provenance, ou {@code null} si la page ne porte pas le mixin ou si la provenance
     *         n'est pas renseignée — dans les deux cas les variables de campagne sont inactives
     */
    public static CampaignParams read(JCRNodeWrapper page) {
        if (page == null) {
            return null;
        }
        try {
            if (!page.isNodeType(SimulationParams.MIXIN)) {
                return null;
            }
        } catch (RepositoryException e) {
            LOG.debug("isNodeType({}) a échoué : {}", SimulationParams.MIXIN, e.getMessage());
            return null;
        }

        String sourceId = JcrReads.readString(page, SimulationParams.PROP_SOURCE_ID);
        if (sourceId == null) {
            // Option activée, provenance vide : rien à interroger. L'audit le signale en édition.
            return null;
        }
        return new CampaignParams(sourceId);
    }

    /**
     * Empreinte stable destinée à la clé de cache de fragment.
     *
     * <p>Une seule partie, là où la simulation en compte cinq : une campagne ne dépend que de sa
     * provenance. Deux pages qui partagent une provenance affichent les mêmes bornes, et peuvent
     * donc légitimement partager leurs fragments.
     *
     * <p>Normalisation déléguée à {@link SimulationParams#sanitize(String)} : les deux empreintes
     * entrent dans la même clé, elles doivent obéir aux mêmes règles de caractères.
     */
    public String signature() {
        return SimulationParams.sanitize(sourceId);
    }
}
