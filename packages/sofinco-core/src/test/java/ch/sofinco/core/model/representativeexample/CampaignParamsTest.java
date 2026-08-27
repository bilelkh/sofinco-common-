package ch.sofinco.core.model.representativeexample;

import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapper;
import org.junit.jupiter.api.Test;

import javax.jcr.RepositoryException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Préconditions de {@link CampaignParams}.
 *
 * <p>Le point de conception vérifié ici : une campagne n'exige QUE la provenance. Confondre ses
 * préconditions avec celles de {@link SimulationParams} obligerait un contributeur qui ne veut
 * afficher que des bornes d'offre à renseigner un type de crédit qu'il n'utilise pas — champ qui
 * pilote des chiffres réglementés et n'a volontairement pas de défaut.
 */
class CampaignParamsTest {

    private static JCRNodeWrapper page(String... types) throws RepositoryException {
        JCRNodeWrapper n = mock(JCRNodeWrapper.class);
        when(n.getPath()).thenReturn("/sites/sofinco/home/pb");
        for (String type : types) {
            when(n.isNodeType(type)).thenReturn(true);
        }
        return n;
    }

    private static void stringProp(JCRNodeWrapper n, String name, String value)
            throws RepositoryException {
        JCRPropertyWrapper p = mock(JCRPropertyWrapper.class);
        when(p.getString()).thenReturn(value);
        when(n.hasProperty(name)).thenReturn(true);
        when(n.getProperty(name)).thenReturn(p);
    }

    // ------------------------------------------------------------------ lecture

    @Test
    void nullPage_isNotACampaign() {
        assertThat(CampaignParams.read(null)).isNull();
    }

    @Test
    void pageWithoutTheMixin_isNotACampaign() throws Exception {
        assertThat(CampaignParams.read(page("jnt:page"))).isNull();
    }

    @Test
    void mixinWithoutSourceId_isNotACampaign() throws Exception {
        assertThat(CampaignParams.read(page("jnt:page", SimulationParams.MIXIN))).isNull();
    }

    /**
     * LE cas qui justifie un record distinct : type de crédit absent, provenance présente. La
     * simulation reste inactive, les variables de campagne doivent fonctionner.
     */
    @Test
    void sourceIdAloneIsEnough_evenWithoutCreditType() throws Exception {
        JCRNodeWrapper page = page("jnt:page", SimulationParams.MIXIN);
        stringProp(page, SimulationParams.PROP_SOURCE_ID, "NEOURL41");

        assertThat(SimulationParams.read(page)).as("la simulation, elle, reste inactive").isNull();
        assertThat(CampaignParams.read(page))
                .isNotNull()
                .extracting(CampaignParams::sourceId)
                .isEqualTo("NEOURL41");
    }

    @Test
    void repositoryFailure_isTreatedAsAbsent() throws Exception {
        JCRNodeWrapper page = mock(JCRNodeWrapper.class);
        when(page.isNodeType(SimulationParams.MIXIN)).thenThrow(new RepositoryException("session close"));

        assertThat(CampaignParams.read(page)).isNull();
    }

    // ------------------------------------------------------------------ empreinte

    @Test
    void signatureIsTheSanitizedSourceId() {
        assertThat(new CampaignParams("NEOURL41").signature()).isEqualTo("NEOURL41");
    }

    /**
     * Même normalisation que {@link SimulationParams} : les deux empreintes entrent dans la même
     * clé de cache de fragment, un caractère accepté d'un côté corromprait la clé de l'autre.
     */
    @Test
    void signatureExcludesTheKeySeparator() {
        assertThat(new CampaignParams("NEO-URL.41").signature())
                .isEqualTo("NEO_URL_41")
                .doesNotContain("-");
    }
}
