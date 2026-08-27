package ch.sofinco.core.validation.simulation;

import ch.sofinco.core.model.representativeexample.SimulationParams;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapper;
import org.junit.jupiter.api.Test;

import javax.jcr.RepositoryException;
import javax.validation.ConstraintValidatorContext;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Contrôle de saisie des paramètres de simulation.
 *
 * <p>Ces tests couvrent la partie qui n'a besoin d'aucun APIM : présence des champs obligatoires et
 * neutralité sur les pages sans mixin. Le volet confrontant la saisie à la campagne est couvert par
 * {@code CampaignLookupTest} et {@code SimulationParamsRangeValidatorTest} — hors conteneur OSGi,
 * {@code CampaignLookup} rend {@code UNAVAILABLE}, ce qui est précisément le comportement voulu :
 * <b>un doute ne bloque jamais une sauvegarde</b>.
 */
class SimulationParamsCompleteValidatorTest {

    private final SimulationParamsCompleteValidator validator = new SimulationParamsCompleteValidator();

    // ------------------------------------------------------------------ fixtures

    /** Contexte Bean Validation qui MÉMORISE les messages, au lieu de les jeter. */
    private static final class RecordingContext {
        private final List<String> messages = new ArrayList<>();
        private final ConstraintValidatorContext ctx = mock(ConstraintValidatorContext.class, RETURNS_DEEP_STUBS);

        RecordingContext() {
            when(ctx.buildConstraintViolationWithTemplate(anyString()))
                    .thenAnswer(i -> {
                        messages.add(i.getArgument(0));
                        return mock(ConstraintValidatorContext.ConstraintViolationBuilder.class,
                                RETURNS_DEEP_STUBS);
                    });
        }
    }

    private static JCRNodeWrapper page(boolean mixin, String product, String sourceId)
            throws RepositoryException {
        JCRNodeWrapper page = mock(JCRNodeWrapper.class);
        when(page.getPath()).thenReturn("/sites/sofinco/home/pb");
        when(page.isNodeType(SimulationParams.MIXIN)).thenReturn(mixin);
        stringProp(page, SimulationParams.PROP_PRODUCT, product);
        stringProp(page, SimulationParams.PROP_SOURCE_ID, sourceId);
        return page;
    }

    private static void stringProp(JCRNodeWrapper node, String name, String value)
            throws RepositoryException {
        if (value == null) {
            when(node.hasProperty(name)).thenReturn(false);
            return;
        }
        JCRPropertyWrapper p = mock(JCRPropertyWrapper.class);
        when(p.getString()).thenReturn(value);
        when(node.hasProperty(name)).thenReturn(true);
        when(node.getProperty(name)).thenReturn(p);
    }

    private boolean validate(JCRNodeWrapper page, RecordingContext recording) {
        return validator.isValid(new SimulationParamsNodeValidator(page), recording.ctx);
    }

    // ------------------------------------------------------------------ neutralité

    @Test
    void nullHolder_isAccepted() {
        assertThat(validator.isValid(null, new RecordingContext().ctx)).isTrue();
    }

    @Test
    void nullNode_isAccepted() {
        assertThat(validator.isValid(new SimulationParamsNodeValidator(null), new RecordingContext().ctx))
                .isTrue();
    }

    /** L'immense majorité des pages : option non activée, rien à exiger. */
    @Test
    void pageWithoutTheMixin_isAccepted() throws Exception {
        RecordingContext recording = new RecordingContext();
        assertThat(validate(page(false, null, null), recording)).isTrue();
        assertThat(recording.messages).isEmpty();
    }

    /** Registre de types indisponible : on ne bloque jamais une sauvegarde sur un doute. */
    @Test
    void whenTheTypeRegistryFails_theSaveIsAccepted() throws Exception {
        JCRNodeWrapper page = mock(JCRNodeWrapper.class);
        when(page.isNodeType(SimulationParams.MIXIN)).thenThrow(new RepositoryException("session close"));

        assertThat(validate(page, new RecordingContext())).isTrue();
    }

    // ------------------------------------------------------------------ champs obligatoires

    @Test
    void mixinWithoutProduct_isRejectedWithAnActionableMessage() throws Exception {
        RecordingContext recording = new RecordingContext();

        assertThat(validate(page(true, null, "NEOURL41"), recording)).isFalse();
        assertThat(recording.messages)
                .contains(SimulationParamsCompleteValidator.MESSAGE_PRODUCT);
    }

    @Test
    void mixinWithoutSourceId_isRejected() throws Exception {
        RecordingContext recording = new RecordingContext();

        assertThat(validate(page(true, "PB", null), recording)).isFalse();
        assertThat(recording.messages)
                .contains(SimulationParamsCompleteValidator.MESSAGE_SOURCE_ID);
    }

    /**
     * Les DEUX manques sont signalés d'une seule sauvegarde. Les révéler l'un après l'autre
     * obligerait le contributeur à un aller-retour par champ manquant.
     */
    @Test
    void bothMissingFieldsAreReportedInASingleSave() throws Exception {
        RecordingContext recording = new RecordingContext();

        assertThat(validate(page(true, null, null), recording)).isFalse();
        assertThat(recording.messages).hasSize(2);
    }

    /**
     * Aucun appel réseau tant qu'un champ manque : le contributeur doit de toute façon compléter
     * sa saisie, interroger l'APIM pour le lui confirmer serait sans objet.
     */
    @Test
    void aMissingSourceId_doesNotTriggerAnyCampaignLookup() throws Exception {
        RecordingContext recording = new RecordingContext();

        assertThat(validate(page(true, "PB", null), recording)).isFalse();
        assertThat(recording.messages)
                .as("seul le champ manquant est signalé, pas un verdict de campagne")
                .containsExactly(SimulationParamsCompleteValidator.MESSAGE_SOURCE_ID);
    }

    /**
     * Saisie complète HORS conteneur OSGi : {@code CampaignLookup} rend {@code UNAVAILABLE} et la
     * sauvegarde passe. C'est le comportement attendu en production dès que l'APIM est injoignable
     * ou en mode mock — le contrôle ne doit jamais coûter au contributeur le travail en cours.
     */
    @Test
    void aCompleteEntry_isAcceptedWhenTheCampaignCannotBeChecked() throws Exception {
        RecordingContext recording = new RecordingContext();

        assertThat(validate(page(true, "PB", "NEOURL41"), recording)).isTrue();
        assertThat(recording.messages).isEmpty();
    }
}
