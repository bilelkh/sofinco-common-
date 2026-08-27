package ch.sofinco.core.validation.simulation;

import org.jahia.services.content.JCRStoreService;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

/**
 * Enregistrement du contrôle de saisie auprès de Jahia.
 *
 * <p>Le type visé est {@code jnt:page} et non le mixin : Jahia indexe ses validateurs par type de
 * nœud, et c'est la page qui porte l'option. Le validateur sort de lui-même sur les pages qui ne
 * l'ont pas activée — soit l'immense majorité.
 */
class SimulationParamsValidatorRegistrarTest {

    @Test
    void activate_registersTheValidatorOnPages() {
        try (MockedStatic<JCRStoreService> statics = mockStatic(JCRStoreService.class)) {
            JCRStoreService service = mock(JCRStoreService.class);
            statics.when(JCRStoreService::getInstance).thenReturn(service);

            new SimulationParamsValidatorRegistrar().activate();

            verify(service).addValidator(SimulationParamsValidatorRegistrar.NODE_TYPE,
                    SimulationParamsNodeValidator.class);
            verifyNoMoreInteractions(service);
        }
    }

    /**
     * Le retrait à l'arrêt du bundle n'est pas cosmétique : un validateur laissé enregistré
     * continuerait de s'appliquer avec le code d'un classloader mort, à chaque redéploiement.
     */
    @Test
    void deactivate_removesTheValidator() {
        try (MockedStatic<JCRStoreService> statics = mockStatic(JCRStoreService.class)) {
            JCRStoreService service = mock(JCRStoreService.class);
            statics.when(JCRStoreService::getInstance).thenReturn(service);

            new SimulationParamsValidatorRegistrar().deactivate();

            verify(service).removeValidator(SimulationParamsValidatorRegistrar.NODE_TYPE);
            verifyNoMoreInteractions(service);
        }
    }
}
