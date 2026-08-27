package ch.sofinco.core.validation.simulation;

import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.decorator.validation.JCRNodeValidator;

/**
 * Porteur du contrôle de complétude de la simulation. Lié une seule fois à {@code jnt:page}
 * (cf. {@link SimulationParamsValidatorRegistrar}). Aucune méthode par champ : toute la logique
 * est portée par {@link SimulationParamsComplete} au niveau classe, ce qui permet de raisonner sur
 * plusieurs propriétés à la fois — ici, produit ET sourceId.
 */
@SimulationParamsComplete
public class SimulationParamsNodeValidator implements JCRNodeValidator {

    private final JCRNodeWrapper node;

    public SimulationParamsNodeValidator(JCRNodeWrapper node) {
        this.node = node;
    }

    public JCRNodeWrapper getNode() {
        return node;
    }
}
