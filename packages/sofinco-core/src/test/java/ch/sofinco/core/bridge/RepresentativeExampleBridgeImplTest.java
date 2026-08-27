package ch.sofinco.core.bridge;

import ch.sofinco.core.enums.CreditVariant;
import ch.sofinco.core.model.representativeexample.RepresentativeExample;
import ch.sofinco.core.model.representativeexample.Row;
import ch.sofinco.core.model.representativeexample.SimulationParams;
import ch.sofinco.core.model.representativeexample.SimulationRequest;
import ch.sofinco.core.service.RepresentativeExampleService;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapper;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.content.JCRWorkspaceWrapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;


import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RepresentativeExampleBridgeImplTest {

    private final RepresentativeExampleService service = mock(RepresentativeExampleService.class);
    private final RequestOriginProvider originProvider = mock(RequestOriginProvider.class);
    private final RepresentativeExampleBridgeImpl bridge =
            new RepresentativeExampleBridgeImpl(service, originProvider);

    @Test
    void getExample_nullComponent_returnsNull() {
        assertThat(bridge.getExample(null)).isNull();
    }

    @Test
    void getExample_missingSourceId_returnsNull() {
        // V2 : pas de child `simulator` — on lit directement sur le node.
        // Si sourceId absent → exemple non calculable.
        JCRNodeWrapper component = mock(JCRNodeWrapper.class);
        when(component.getPath()).thenReturn("/comp");
        // hasProperty("sourceId") retourne false → JcrReads.readString = null
        assertThat(bridge.getExample(component)).isNull();
    }

    @Test
    void getExample_serviceEmpty_returnsNull() throws Exception {
        JCRNodeWrapper component = componentWithSimulatorProps("PB", "SRC");
        when(originProvider.currentOrigin()).thenReturn(null);
        when(service.getExample(any())).thenReturn(Optional.empty());
        assertThat(bridge.getExample(component)).isNull();
    }

    @Test
    void getExample_mapsToFrozenJavaScriptContract() throws Exception {
        JCRNodeWrapper component = componentWithSimulatorProps("PB", "SRC");
        when(originProvider.currentOrigin()).thenReturn("https://o");
        when(service.getExample(any())).thenReturn(Optional.of(sampleExample()));

        Map<String, Object> out = bridge.getExample(component);

        assertThat(out).containsOnlyKeys(
                        "variant", "exampleAmount", "rows", "insurance", "insuranceTextOverride")
                .containsEntry("variant", "pretPerso")
                .containsEntry("exampleAmount", "15 000,00 €")
                .containsEntry("insuranceTextOverride", "<p>x</p>");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) out.get("rows");
        assertThat(rows).hasSize(2);
        assertThat(rows.get(0)).containsEntry("labelKey", "monthly")
                .containsEntry("value", "344,03 €")
                .containsEntry("highlighted", false)
                .containsEntry("labelParam", null);
        assertThat(rows.get(1)).containsEntry("highlighted", true);

        @SuppressWarnings("unchecked")
        Map<String, Object> insurance = (Map<String, Object>) out.get("insurance");
        assertThat(insurance).containsEntry("taea", "2,419 %");

        // la demande transporte bien les params lus + l'origin
        ArgumentCaptor<SimulationRequest> cap = ArgumentCaptor.forClass(SimulationRequest.class);
        verify(service).getExample(cap.capture());
        assertThat(cap.getValue().product()).isEqualTo("PB");
        assertThat(cap.getValue().sourceCode()).isEqualTo("SRC");
        assertThat(cap.getValue().requestOrigin()).isEqualTo("https://o");
    }

    /**
     * Aucune source : ni le composant ni une page englobante ne portent de paramètres.
     */
    @Test
    void getExample_nodeWithoutEnclosingPage_returnsNull() {
        JCRNodeWrapper orphan = mock(JCRNodeWrapper.class);
        when(orphan.getPath()).thenReturn("/contents/orphelin");

        assertThat(bridge.getExample(orphan)).isNull();
    }

    // ----------------------------------------------------------------- cascade transitoire

    /**
     * <b>Contenu NON encore migré.</b> Le composant porte ses propres paramètres, la page n'a pas
     * le mixin. Lire la page seule ferait disparaître l'exemple représentatif — donc une mention
     * légale — sans la moindre erreur. Ce cas disparaîtra avec la seconde livraison, une fois
     * {@code migrate-simulation-params-to-page.groovy} rejoué partout.
     */
    @Test
    void getExample_legacyComponentParams_stillWork() throws Exception {
        JCRNodeWrapper component = mock(JCRNodeWrapper.class);
        when(component.getPath()).thenReturn("/sites/sofinco/home/cr/main/exemple");
        stubString(component, "product", "CR");
        stubString(component, "sourceId", "NEOURL02");
        stubLong(component, "amount", 3000L);
        stubLong(component, "dueNumber", 36L);
        when(service.getExample(any())).thenReturn(Optional.of(sampleExample()));

        assertThat(bridge.getExample(component)).isNotNull();

        ArgumentCaptor<SimulationRequest> cap = ArgumentCaptor.forClass(SimulationRequest.class);
        verify(service).getExample(cap.capture());
        assertThat(cap.getValue().product()).isEqualTo("CR");
        assertThat(cap.getValue().amount()).isEqualTo(3000L);
    }

    /**
     * Les deux sources renseignées : la PAGE l'emporte. C'est elle que le contributeur peut
     * encore éditer — les champs du composant sont masqués dans le formulaire.
     */
    @Test
    void getExample_pageWinsOverLeftoverComponentValues() throws Exception {
        JCRNodeWrapper page = componentWithSimulatorProps("PB", "SRC-PAGE");
        stubString(page, "product", "CR");          // reliquat non nettoyé
        stubString(page, "sourceId", "SRC-LEGACY");
        when(service.getExample(any())).thenReturn(Optional.of(sampleExample()));

        bridge.getExample(page);

        ArgumentCaptor<SimulationRequest> cap = ArgumentCaptor.forClass(SimulationRequest.class);
        verify(service).getExample(cap.capture());
        assertThat(cap.getValue().product()).isEqualTo("PB");
        assertThat(cap.getValue().sourceCode()).isEqualTo("SRC-PAGE");
    }

    /** Composant vidé par la migration : la cascade retombe sur la page, sans rien casser. */
    @Test
    void getExample_afterMigration_fallsBackToThePage() throws Exception {
        JCRNodeWrapper page = componentWithSimulatorProps("PB", "SRC-PAGE");
        when(service.getExample(any())).thenReturn(Optional.of(sampleExample()));

        bridge.getExample(page);

        ArgumentCaptor<SimulationRequest> cap = ArgumentCaptor.forClass(SimulationRequest.class);
        verify(service).getExample(cap.capture());
        assertThat(cap.getValue().product()).isEqualTo("PB");
        assertThat(cap.getValue().sourceCode()).isEqualTo("SRC-PAGE");
    }

    /** Page portant le mixin mais sans {@code simSourceId} : l'APIM ne peut pas être interrogé. */
    @Test
    void getExample_pageWithoutSourceId_returnsNull() throws Exception {
        JCRNodeWrapper page = mock(JCRNodeWrapper.class);
        when(page.getPath()).thenReturn("/sites/sofinco/home/page");
        when(page.isNodeType("jnt:page")).thenReturn(true);
        when(page.isNodeType(SimulationParams.MIXIN)).thenReturn(true);
        stubString(page, SimulationParams.PROP_PRODUCT, "PB");
        // simSourceId absent → hasProperty false

        assertThat(bridge.getExample(page)).isNull();
    }

    /**
     * Le workspace décide de la mise en cache. {@code default} = aperçu ou édition : le
     * contributeur doit voir la réponse réelle, pas une valeur mémorisée.
     */
    @Test
    void getExample_marksTheRequestAccordingToTheWorkspace() throws Exception {
        JCRNodeWrapper page = componentWithSimulatorProps("PB", "SRC");
        stubWorkspace(page, "default");
        when(service.getExample(any())).thenReturn(Optional.of(sampleExample()));

        bridge.getExample(page);

        ArgumentCaptor<SimulationRequest> cap = ArgumentCaptor.forClass(SimulationRequest.class);
        verify(service).getExample(cap.capture());
        assertThat(cap.getValue().isCacheable()).isFalse();
    }

    @Test
    void getExample_liveWorkspace_marksTheRequestCacheable() throws Exception {
        JCRNodeWrapper page = componentWithSimulatorProps("PB", "SRC");
        stubWorkspace(page, "live");
        when(service.getExample(any())).thenReturn(Optional.of(sampleExample()));

        bridge.getExample(page);

        ArgumentCaptor<SimulationRequest> cap = ArgumentCaptor.forClass(SimulationRequest.class);
        verify(service).getExample(cap.capture());
        assertThat(cap.getValue().isCacheable()).isTrue();
    }

    @Test
    void getExample_worksWithoutOriginProvider() throws Exception {
        RepresentativeExampleBridgeImpl noProvider =
                new RepresentativeExampleBridgeImpl(service, null);
        JCRNodeWrapper component = componentWithSimulatorProps("CR", "SRC2");
        when(service.getExample(any())).thenReturn(Optional.of(sampleExample()));

        assertThat(noProvider.getExample(component)).isNotNull();
    }

    @Test
    void configNodeType_respecteLaFormeCnd() {
        // Invariant vérifié au build plutôt qu'à l'exécution : la query JCR de findConfigNode
        // interpole cette constante dans un SELECT * FROM [...], sans échappement possible.
        assertThat(RepresentativeExampleBridgeImpl.CONFIG_NODE_TYPE)
                .matches("^[a-zA-Z]\\w*:[a-zA-Z]\\w*$");
    }

    // ----------------------------------------------------------------- helpers

    /**
     * Mock d'un nœud PAGE portant {@code sofmix:simulationParams}.
     *
     * <p>Les paramètres ne vivent plus sur le composant : le bridge remonte au {@code jnt:page}
     * englobant, exactement comme le filtre de rendu. Un nœud qui porterait encore
     * {@code product} / {@code amount} en propre serait donc ignoré — c'est le but du retrait.
     */
    private static JCRNodeWrapper componentWithSimulatorProps(String product, String sourceId) throws Exception {
        JCRNodeWrapper page = mock(JCRNodeWrapper.class);
        when(page.getResolveSite()).thenReturn(null);   // → config node null, fallbacks
        when(page.getPath()).thenReturn("/sites/sofinco/home/page");
        when(page.isNodeType("jnt:page")).thenReturn(true);
        when(page.isNodeType(SimulationParams.MIXIN)).thenReturn(true);
        stubString(page, SimulationParams.PROP_PRODUCT, product);
        stubString(page, SimulationParams.PROP_SOURCE_ID, sourceId);
        return page;
    }

    /** Workspace du nœud — `live` en publication, `default` en aperçu et en édition. */
    private static void stubWorkspace(JCRNodeWrapper node, String name) throws Exception {
        JCRSessionWrapper session = mock(JCRSessionWrapper.class);
        JCRWorkspaceWrapper workspace = mock(JCRWorkspaceWrapper.class);
        when(node.getSession()).thenReturn(session);
        when(session.getWorkspace()).thenReturn(workspace);
        when(workspace.getName()).thenReturn(name);
    }

    private static void stubLong(JCRNodeWrapper node, String prop, long value) throws Exception {
        JCRPropertyWrapper p = mock(JCRPropertyWrapper.class);
        when(node.hasProperty(prop)).thenReturn(true);
        when(node.getProperty(prop)).thenReturn(p);
        when(p.getLong()).thenReturn(value);
    }

    private static void stubString(JCRNodeWrapper node, String prop, String value) throws Exception {
        JCRPropertyWrapper p = mock(JCRPropertyWrapper.class);
        when(node.hasProperty(prop)).thenReturn(true);
        when(node.getProperty(prop)).thenReturn(p);
        when(p.getString()).thenReturn(value);
    }

    private static RepresentativeExample sampleExample() {
        Map<String, String> insurance = new LinkedHashMap<>();
        insurance.put("taea", "2,419 %");
        return new RepresentativeExample(
                CreditVariant.PRET_PERSO,
                null,
                "15 000,00 €",
                List.of(new Row("monthly", "344,03 €"), Row.highlighted("total", "16 513,44 €")),
                insurance,
                "<p>x</p>");
    }
}
