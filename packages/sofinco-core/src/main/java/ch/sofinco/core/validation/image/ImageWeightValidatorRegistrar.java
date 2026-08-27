package ch.sofinco.core.validation.image;

import org.jahia.services.content.JCRStoreService;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Deactivate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Enregistre le validateur de poids d'images au cycle de vie du bundle (OSGi Declarative Services).
 * Remplace l'ancien META-INF/spring + MethodInvokingFactoryBean : l'{@code @Deactivate} retire
 * proprement le validateur au stop/refresh du bundle (pas de fuite de classloader).
 */
@Component(immediate = true)
public class ImageWeightValidatorRegistrar {

    private static final Logger LOGGER = LoggerFactory.getLogger(ImageWeightValidatorRegistrar.class);
    private static final String NODE_TYPE = "jnt:content";

    @Activate
    public void activate() {
        JCRStoreService.getInstance().addValidator(NODE_TYPE, ImageWeightNodeValidator.class);
        LOGGER.info("Validateur de poids des images enregistre sur {}", NODE_TYPE);
    }

    @Deactivate
    public void deactivate() {
        JCRStoreService.getInstance().removeValidator(NODE_TYPE);
        LOGGER.info("Validateur de poids des images retire de {}", NODE_TYPE);
    }
}
