package ch.sofinco.core.model.representativeexample;

import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapper;
import org.junit.jupiter.api.Test;

import javax.jcr.RepositoryException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SimulationParamsTest {

    // ------------------------------------------------------------------ fixtures

    private static JCRNodeWrapper node(String path, String... types) throws RepositoryException {
        JCRNodeWrapper n = mock(JCRNodeWrapper.class);
        when(n.getPath()).thenReturn(path);
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

    private static void longProp(JCRNodeWrapper n, String name, long value)
            throws RepositoryException {
        JCRPropertyWrapper p = mock(JCRPropertyWrapper.class);
        when(p.getLong()).thenReturn(value);
        when(n.hasProperty(name)).thenReturn(true);
        when(n.getProperty(name)).thenReturn(p);
    }

    /** Page portant le mixin, avec un jeu de paramètres complet. */
    private static JCRNodeWrapper fullPage() throws RepositoryException {
        JCRNodeWrapper page = node("/sites/sofinco/home/cr", "jnt:page", SimulationParams.MIXIN);
        stringProp(page, SimulationParams.PROP_PRODUCT, "CR");
        longProp(page, SimulationParams.PROP_AMOUNT, 4500L);
        longProp(page, SimulationParams.PROP_DURATION, 48L);
        stringProp(page, SimulationParams.PROP_SCALE_CODE, "BAREME7");
        stringProp(page, SimulationParams.PROP_SOURCE_ID, "NEOURL02");
        return page;
    }

    // ------------------------------------------------------------------ read

    @Test
    void read_nullNode_returnsNull() {
        assertThat(SimulationParams.read(null)).isNull();
    }

    @Test
    void read_pageWithoutMixin_returnsNull() throws Exception {
        assertThat(SimulationParams.read(node("/p", "jnt:page"))).isNull();
    }

    /**
     * Le cœur de la décision produit : {@code simProduct} n'a pas de défaut au CND. Une page dont
     * le type de crédit n'est pas renseigné NE DOIT PAS produire de chiffres — ils seraient
     * plausibles et faux, donc invisibles en relecture.
     */
    @Test
    void read_mixinWithoutProduct_returnsNull() throws Exception {
        JCRNodeWrapper page = node("/p", "jnt:page", SimulationParams.MIXIN);
        longProp(page, SimulationParams.PROP_AMOUNT, 3000L);
        assertThat(SimulationParams.read(page)).isNull();
    }

    @Test
    void read_completeMixin_readsAllFiveProperties() throws Exception {
        SimulationParams params = SimulationParams.read(fullPage());

        assertThat(params).isNotNull();
        assertThat(params.product()).isEqualTo("CR");
        assertThat(params.amount()).isEqualTo(4500L);
        assertThat(params.duration()).isEqualTo(48L);
        assertThat(params.scaleCode()).isEqualTo("BAREME7");
        assertThat(params.sourceId()).isEqualTo("NEOURL02");
    }

    /**
     * MONTANT ET DUREE ABSENTS : ON NE SUBSTITUE RIEN.
     *
     * <p>C'est ce qui rend effective la cascade de
     * {@code RepresentativeExampleServiceImpl#resolveAmount} — page →
     * {@code sofnt:representativeExampleConfig} → repli code. Substituer un defaut ici
     * remplissait `amount`, donc `resolveAmount` s'arretait au premier etage et l'etage
     * intermediaire — le seul reglable par le metier sans livraison — n'etait jamais atteint.
     *
     * <p>Aucun defaut ne PEUT vivre ici : les bornes viennent de la campagne, et les planchers
     * divergent entre les trois produits (150 EUR en CR, 3 001 EUR en PB et RAC, plafond CR a
     * 10 000 EUR). Une valeur unique valide pour l'un est refusee par l'autre.
     */
    @Test
    void read_missingAmountAndDuration_leavesThemNullSoTheCascadeApplies() throws Exception {
        JCRNodeWrapper page = node("/p", "jnt:page", SimulationParams.MIXIN);
        stringProp(page, SimulationParams.PROP_PRODUCT, "PB");

        SimulationParams params = SimulationParams.read(page);

        assertThat(params.amount()).as("montant laisse a la cascade").isNull();
        assertThat(params.duration()).as("duree laissee a la cascade").isNull();
    }

    /** Une valeur explicitement saisie reste prioritaire — la cascade ne s'applique qu'a defaut. */
    @Test
    void read_explicitAmountAndDuration_winOverTheCascade() throws Exception {
        JCRNodeWrapper page = node("/p", "jnt:page", SimulationParams.MIXIN);
        stringProp(page, SimulationParams.PROP_PRODUCT, "PB");
        longProp(page, SimulationParams.PROP_AMOUNT, 15000L);
        longProp(page, SimulationParams.PROP_DURATION, 60L);

        SimulationParams params = SimulationParams.read(page);

        assertThat(params.amount()).isEqualTo(15000L);
        assertThat(params.duration()).isEqualTo(60L);
    }

    @Test
    void read_repositoryExceptionOnIsNodeType_returnsNullWithoutThrowing() throws Exception {
        JCRNodeWrapper page = mock(JCRNodeWrapper.class);
        when(page.isNodeType(SimulationParams.MIXIN)).thenThrow(new RepositoryException("boom"));

        assertThat(SimulationParams.read(page)).isNull();
    }

    // ------------------------------------------------------------------ findPage

    @Test
    void findPage_nodeIsAlreadyThePage_returnsItself() throws Exception {
        JCRNodeWrapper page = node("/sites/s/home", "jnt:page");
        assertThat(SimulationParams.findPage(page)).isSameAs(page);
    }

    @Test
    void findPage_walksUpFromContent() throws Exception {
        JCRNodeWrapper page = node("/sites/s/home", "jnt:page");
        JCRNodeWrapper content = node("/sites/s/home/main/text", "sofnt:textBlock");
        when(content.getParent()).thenReturn(page);

        assertThat(SimulationParams.findPage(content)).isSameAs(page);
    }

    @Test
    void findPage_stopsAtRootInsteadOfLooping() throws Exception {
        JCRNodeWrapper root = node("/", "rep:root");
        JCRNodeWrapper orphan = node("/orphan", "nt:base");
        when(orphan.getParent()).thenReturn(root);

        assertThat(SimulationParams.findPage(orphan)).isNull();
    }

    @Test
    void findPage_nullNode_returnsNull() {
        assertThat(SimulationParams.findPage(null)).isNull();
    }

    // ------------------------------------------------------------------ signature

    /**
     * L'empreinte est ce qui isole les entrées de cache. Deux jeux de paramètres différents
     * DOIVENT produire deux empreintes différentes — sinon un texte substitué fuite d'une page
     * à l'autre.
     */
    @Test
    void signature_differsWhenAnyParameterDiffers() throws Exception {
        SimulationParams base = SimulationParams.read(fullPage());

        assertThat(new SimulationParams("PB", 4500L, 48L, "BAREME7", "NEOURL02").signature())
                .isNotEqualTo(base.signature());
        assertThat(new SimulationParams("CR", 3000L, 48L, "BAREME7", "NEOURL02").signature())
                .isNotEqualTo(base.signature());
        assertThat(new SimulationParams("CR", 4500L, 36L, "BAREME7", "NEOURL02").signature())
                .isNotEqualTo(base.signature());
        assertThat(new SimulationParams("CR", 4500L, 48L, "AUTRE", "NEOURL02").signature())
                .isNotEqualTo(base.signature());
        assertThat(new SimulationParams("CR", 4500L, 48L, "BAREME7", "NEOURL99").signature())
                .isNotEqualTo(base.signature());
    }

    /** Deux pages aux mêmes paramètres partagent leurs fragments — c'est l'intérêt vs mainResource. */
    @Test
    void signature_isStableForIdenticalParameters() {
        assertThat(new SimulationParams("CR", 3000L, 36L, "B7", "SRC").signature())
                .isEqualTo(new SimulationParams("CR", 3000L, 36L, "B7", "SRC").signature());
    }

    /**
     * Le tiret sépare les champs de l'empreinte : il ne doit donc jamais survivre à
     * l'assainissement, sans quoi le découpage devient ambigu. Tant que {@code sanitize}
     * conservait {@code -}, ces deux configurations produisaient la MÊME empreinte
     * {@code PB-15000-48-A-B-C} et partageaient donc une entrée de cache.
     */
    @Test
    void signature_isNotAmbiguousWhenAValueContainsTheSeparator() {
        String scaleHasHyphen = new SimulationParams("PB", 15000L, 48L, "A-B", "C").signature();
        String sourceHasHyphen = new SimulationParams("PB", 15000L, 48L, "A", "B-C").signature();

        assertThat(scaleHasHyphen).isNotEqualTo(sourceHasHyphen);
        assertThat(scaleHasHyphen.split("-")).hasSize(5);
        assertThat(sourceHasHyphen.split("-")).hasSize(5);
    }

    @Test
    void signature_neverCollidesWithTheNoSimulationMarker() {
        assertThat(new SimulationParams("CR", 3000L, 36L, null, null).signature())
                .isNotEqualTo(SimulationParams.NO_SIMULATION);
    }

    /** La clé de cache Jahia est découpée sur des séparateurs : aucun caractère exotique. */
    @Test
    void signature_containsOnlyCacheKeySafeCharacters() {
        String signature = new SimulationParams(
                "CR", 3000L, 36L, "BAR EME#7", "src/with:weird|chars").signature();

        assertThat(signature).matches("[A-Za-z0-9_-]+");
    }
}
