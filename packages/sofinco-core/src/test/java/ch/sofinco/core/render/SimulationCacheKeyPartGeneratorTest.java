package ch.sofinco.core.render;

import ch.sofinco.core.model.representativeexample.SimulationParams;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapper;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.junit.jupiter.api.Test;

import javax.jcr.RepositoryException;
import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SimulationCacheKeyPartGeneratorTest {

    private final SimulationCacheKeyPartGenerator generator = new SimulationCacheKeyPartGenerator();

    // ------------------------------------------------------------------ fixtures

    private static HttpServletRequest requestWithAttributes() {
        Map<String, Object> attributes = new HashMap<>();
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getAttribute(anyString())).thenAnswer(i -> attributes.get(i.getArgument(0)));
        org.mockito.Mockito.doAnswer(i -> {
            attributes.put(i.getArgument(0), i.getArgument(1));
            return null;
        }).when(request).setAttribute(anyString(), any());
        return request;
    }

    private static JCRNodeWrapper page(String product, String scaleCode) throws RepositoryException {
        JCRNodeWrapper page = mock(JCRNodeWrapper.class);
        when(page.getPath()).thenReturn("/sites/sofinco/home/cr");
        when(page.isNodeType("jnt:page")).thenReturn(true);
        when(page.isNodeType(SimulationParams.MIXIN)).thenReturn(product != null);
        if (product != null) {
            stringProp(page, SimulationParams.PROP_PRODUCT, product);
            stringProp(page, SimulationParams.PROP_SCALE_CODE, scaleCode);
        }
        return page;
    }

    private static void stringProp(JCRNodeWrapper n, String name, String value)
            throws RepositoryException {
        if (value == null) {
            return;
        }
        JCRPropertyWrapper p = mock(JCRPropertyWrapper.class);
        when(p.getString()).thenReturn(value);
        when(n.hasProperty(name)).thenReturn(true);
        when(n.getProperty(name)).thenReturn(p);
    }

    private static RenderContext contextOn(JCRNodeWrapper mainNode, HttpServletRequest request) {
        Resource main = mock(Resource.class);
        when(main.getNode()).thenReturn(mainNode);
        RenderContext context = mock(RenderContext.class);
        when(context.getRequest()).thenReturn(request);
        when(context.getMainResource()).thenReturn(main);
        return context;
    }

    private String value(RenderContext context) {
        return generator.getValue(mock(Resource.class), context, new Properties());
    }

    // ------------------------------------------------------------------ tests

    @Test
    void keyIsStable() {
        // Le changer invaliderait tout le cache de fragments du site.
        assertThat(generator.getKey()).isEqualTo("sofincoSim");
    }

    /**
     * LE test qui justifie l'existence de la classe : deux pages aux paramètres différents ne
     * doivent JAMAIS partager une entrée de cache, sinon un texte substitué fuite de l'une à
     * l'autre — avec des chiffres réglementés faux.
     */
    @Test
    void pagesWithDifferentParametersGetDifferentKeyParts() throws Exception {
        String a = value(contextOn(page("CR", "BAREME7"), requestWithAttributes()));
        String b = value(contextOn(page("PB", "BAREME7"), requestWithAttributes()));

        assertThat(a).isNotEqualTo(b);
    }

    @Test
    void aPageWithoutSimulationIsIsolatedFromPagesWithOne() throws Exception {
        String withSimulation = value(contextOn(page("CR", "B7"), requestWithAttributes()));
        String without = value(contextOn(page(null, null), requestWithAttributes()));

        assertThat(without).isEqualTo(SimulationParams.NO_SIMULATION).isNotEqualTo(withSimulation);
    }

    /** Deux pages identiquement paramétrées partagent leurs fragments — l'intérêt vs mainResource. */
    @Test
    void pagesWithIdenticalParametersShareTheSameKeyPart() throws Exception {
        String a = value(contextOn(page("CR", "B7"), requestWithAttributes()));
        String b = value(contextOn(page("CR", "B7"), requestWithAttributes()));

        assertThat(a).isEqualTo(b);
    }

    /** {@code getValue} est appelé une fois par fragment : la remontée JCR doit être mémorisée. */
    @Test
    void theValueIsComputedOncePerRequest() throws Exception {
        JCRNodeWrapper page = page("CR", "B7");
        AtomicInteger reads = new AtomicInteger();
        when(page.isNodeType(SimulationParams.MIXIN)).thenAnswer(i -> {
            reads.incrementAndGet();
            return true;
        });

        RenderContext context = contextOn(page, requestWithAttributes());
        value(context);
        value(context);
        value(context);

        assertThat(reads).hasValue(1);
    }

    @Test
    void nullRenderContext_yieldsTheNoSimulationMarker() {
        assertThat(value(null)).isEqualTo(SimulationParams.NO_SIMULATION);
    }

    /**
     * PRUDENCE DÉLIBÉRÉE : en cas d'échec on isole la clé plutôt que de retomber sur `none`, qui
     * ferait partager l'entrée d'une page sans simulation — exactement la fuite à empêcher.
     */
    @Test
    void anUnexpectedFailureIsolatesTheKeyInsteadOfFallingBackToNone() {
        RenderContext context = mock(RenderContext.class);
        when(context.getRequest()).thenThrow(new IllegalStateException("plus de requête"));

        String result = value(context);

        assertThat(result).isEqualTo("unknown").isNotEqualTo(SimulationParams.NO_SIMULATION);
    }

    /**
     * LE défaut que ce mécanisme existe pour empêcher, sur le chemin des CAMPAGNES.
     *
     * <p>Une page portant une provenance mais PAS de type de crédit produisait {@code none}, comme
     * toute page sans simulation. Deux pages aux provenances différentes partageaient donc la même
     * clé — et se seraient servi mutuellement leurs fragments dès que les variables de campagne y
     * afficheraient des montants ou des taux.
     */
    @Test
    void twoSourcesWithoutCreditType_doNotShareTheSameKey() throws Exception {
        String first = value(contextOn(campaignOnlyPage("NEOURL41"), requestWithAttributes()));
        String second = value(contextOn(campaignOnlyPage("NEOURL02"), requestWithAttributes()));

        assertThat(first).isNotEqualTo(second);
        assertThat(first).contains("NEOURL41");
    }

    /** Une page réellement sans rien reste sur l'empreinte partagée : c'est le cas mutualisable. */
    @Test
    void aPageWithNeitherProductNorSource_keepsTheSharedKey() throws Exception {
        assertThat(value(contextOn(page(null, null), requestWithAttributes())))
                .isEqualTo(SimulationParams.NO_SIMULATION);
    }

    /**
     * Quand la simulation est active, sa signature porte DÉJÀ la provenance : rien n'est ajouté, et
     * la clé des pages existantes reste inchangée — le cache de fragments n'est donc pas invalidé
     * par cette évolution.
     */
    @Test
    void anActiveSimulationKeyIsLeftUntouched() throws Exception {
        JCRNodeWrapper page = page("CR", "BAREME7");
        stringProp(page, SimulationParams.PROP_SOURCE_ID, "NEOURL41");

        assertThat(value(contextOn(page, requestWithAttributes())))
                .isEqualTo(SimulationParams.read(page).signature())
                .doesNotContain(SimulationParams.NO_SIMULATION);
    }

    /** Page portant la provenance seule — la simulation y est inactive. */
    private static JCRNodeWrapper campaignOnlyPage(String sourceId) throws RepositoryException {
        JCRNodeWrapper page = mock(JCRNodeWrapper.class);
        when(page.getPath()).thenReturn("/sites/sofinco/home/" + sourceId);
        when(page.isNodeType("jnt:page")).thenReturn(true);
        when(page.isNodeType(SimulationParams.MIXIN)).thenReturn(true);
        stringProp(page, SimulationParams.PROP_SOURCE_ID, sourceId);
        return page;
    }

    @Test
    void placeholdersAreReturnedUnchanged() {
        // L'empreinte dépend de la page, jamais du visiteur : rien à substituer après coup.
        assertThat(generator.replacePlaceholders(mock(RenderContext.class), "sofincoSim-CR"))
                .isEqualTo("sofincoSim-CR");
    }
}
