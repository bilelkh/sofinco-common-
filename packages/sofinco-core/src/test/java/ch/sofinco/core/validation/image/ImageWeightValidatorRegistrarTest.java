package ch.sofinco.core.validation.image;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

import org.jahia.services.content.JCRStoreService;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

/**
 * Tests unitaires de {@link ImageWeightValidatorRegistrar} : cycle de vie OSGi DS.
 * Le singleton {@link JCRStoreService#getInstance()} est remplacé par un mock statique
 * pour vérifier l'enregistrement/retrait du validateur sur jnt:content.
 */
class ImageWeightValidatorRegistrarTest {

    private static final String NODE_TYPE = "jnt:content";

    @Test
    void activate_registersValidatorOnJntContent() {
        try (MockedStatic<JCRStoreService> statics = mockStatic(JCRStoreService.class)) {
            JCRStoreService service = mock(JCRStoreService.class);
            statics.when(JCRStoreService::getInstance).thenReturn(service);

            new ImageWeightValidatorRegistrar().activate();

            verify(service).addValidator(NODE_TYPE, ImageWeightNodeValidator.class);
            verifyNoMoreInteractions(service);
        }
    }

    @Test
    void deactivate_removesValidatorFromJntContent() {
        try (MockedStatic<JCRStoreService> statics = mockStatic(JCRStoreService.class)) {
            JCRStoreService service = mock(JCRStoreService.class);
            statics.when(JCRStoreService::getInstance).thenReturn(service);

            new ImageWeightValidatorRegistrar().deactivate();

            verify(service).removeValidator(NODE_TYPE);
            verifyNoMoreInteractions(service);
        }
    }

    @Test
    void activateThenDeactivate_registersThenRemoves() {
        try (MockedStatic<JCRStoreService> statics = mockStatic(JCRStoreService.class)) {
            JCRStoreService service = mock(JCRStoreService.class);
            statics.when(JCRStoreService::getInstance).thenReturn(service);

            ImageWeightValidatorRegistrar registrar = new ImageWeightValidatorRegistrar();
            registrar.activate();
            registrar.deactivate();

            verify(service).addValidator(NODE_TYPE, ImageWeightNodeValidator.class);
            verify(service).removeValidator(NODE_TYPE);
        }
    }
}
