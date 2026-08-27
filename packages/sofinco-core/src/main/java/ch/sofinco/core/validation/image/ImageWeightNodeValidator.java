package ch.sofinco.core.validation.image;

import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.decorator.validation.JCRNodeValidator;

/**
 * Porteur du contrôle de poids d'images. Lié une seule fois à jnt:content
 * (cf. {@link ImageWeightValidatorRegistrar}). Aucune méthode par champ :
 * toute la logique est portée par {@link MaxImageWeight} au niveau classe,
 * ce qui permet de couvrir tous les composants sans toucher aux CND.
 */
@MaxImageWeight
public class ImageWeightNodeValidator implements JCRNodeValidator {

    private final JCRNodeWrapper node;

    public ImageWeightNodeValidator(JCRNodeWrapper node) {
        this.node = node;
    }

    public JCRNodeWrapper getNode() {
        return node;
    }
}
