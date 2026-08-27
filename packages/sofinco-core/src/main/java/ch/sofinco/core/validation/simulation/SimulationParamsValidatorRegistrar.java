package ch.sofinco.core.validation.simulation;

import org.jahia.services.content.JCRStoreService;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Deactivate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Enregistre le contrôle de complétude de la simulation au cycle de vie du bundle (OSGi DS).
 * L'{@code @Deactivate} le retire proprement au stop/refresh (pas de fuite de classloader).
 *
 * <h2>⚠ UN SEUL VALIDATEUR PAR TYPE DE NŒUD</h2>
 * <p>{@code JCRStoreService.addValidator} fait un {@code Map.put} indexé par nom de type, et
 * {@code removeValidator} supprime par type. Enregistrer un second validateur sur
 * {@code jnt:page} écraserait celui-ci <b>en silence</b>, sans erreur ni log. Le jour où un autre
 * contrôle de page est nécessaire, il faut le FUSIONNER dans
 * {@link SimulationParamsNodeValidator} — pas ajouter un registrar.
 *
 * <p>Le type est volontairement {@code jnt:page} et non {@code jnt:content} : le mixin
 * {@code sofmix:simulationParams} est porté par la page. {@code ImageWeightValidatorRegistrar}
 * occupe déjà {@code jnt:content} ; comme {@code jnt:page} en hérite, les deux contrôles
 * s'appliquent aux pages sans se gêner — chacun sous sa propre clé.
 */
@Component(immediate = true)
public class SimulationParamsValidatorRegistrar {

    private static final Logger logger =
            LoggerFactory.getLogger(SimulationParamsValidatorRegistrar.class);

    static final String NODE_TYPE = "jnt:page";

    @Activate
    public void activate() {
        JCRStoreService.getInstance().addValidator(NODE_TYPE, SimulationParamsNodeValidator.class);
        logger.info("Validateur de completude de la simulation enregistre sur {}", NODE_TYPE);
    }

    @Deactivate
    public void deactivate() {
        JCRStoreService.getInstance().removeValidator(NODE_TYPE);
        logger.info("Validateur de completude de la simulation retire de {}", NODE_TYPE);
    }
}
