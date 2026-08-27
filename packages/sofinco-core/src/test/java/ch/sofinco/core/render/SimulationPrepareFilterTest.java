package ch.sofinco.core.render;

import ch.sofinco.core.bridge.CampaignBridge;
import ch.sofinco.core.bridge.RepresentativeExampleBridge;
import ch.sofinco.core.model.representativeexample.SimulationParams;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapper;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.junit.jupiter.api.Test;
import org.objectweb.asm.AnnotationVisitor;
import org.objectweb.asm.ClassReader;
import org.objectweb.asm.ClassVisitor;
import org.objectweb.asm.FieldVisitor;
import org.objectweb.asm.Opcodes;

import javax.jcr.RepositoryException;
import javax.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SimulationPrepareFilterTest {

    // ------------------------------------------------------------------ fixtures

    /** Requête minimale à attributs réels — Mockito seul ne mémorise pas les setAttribute. */
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

    private static JCRNodeWrapper simulationPage(String product) throws RepositoryException {
        JCRNodeWrapper page = mock(JCRNodeWrapper.class);
        when(page.getPath()).thenReturn("/sites/sofinco/home/cr");
        when(page.isNodeType("jnt:page")).thenReturn(true);
        when(page.isNodeType(SimulationParams.MIXIN)).thenReturn(true);
        if (product != null) {
            JCRPropertyWrapper p = mock(JCRPropertyWrapper.class);
            when(p.getString()).thenReturn(product);
            when(page.hasProperty(SimulationParams.PROP_PRODUCT)).thenReturn(true);
            when(page.getProperty(SimulationParams.PROP_PRODUCT)).thenReturn(p);
        }
        return page;
    }

    private static RenderContext contextOn(JCRNodeWrapper mainNode, HttpServletRequest request) {
        Resource main = mock(Resource.class);
        when(main.getNode()).thenReturn(mainNode);
        RenderContext context = mock(RenderContext.class);
        when(context.getRequest()).thenReturn(request);
        when(context.getMainResource()).thenReturn(main);
        return context;
    }

    /** Ajoute une provenance a une page — ce que la famille CAMPAGNE exige, et elle seule. */
    private static JCRNodeWrapper withSourceId(JCRNodeWrapper page, String sourceId)
            throws RepositoryException {
        JCRPropertyWrapper p = mock(JCRPropertyWrapper.class);
        when(p.getString()).thenReturn(sourceId);
        when(page.hasProperty(SimulationParams.PROP_SOURCE_ID)).thenReturn(true);
        when(page.getProperty(SimulationParams.PROP_SOURCE_ID)).thenReturn(p);
        return page;
    }

    private static Map<String, Object> campaignVars() {
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("minAmount", "3 001 €");
        return vars;
    }

    private static Map<String, Object> simulation() {
        Map<String, Object> simulation = new LinkedHashMap<>();
        simulation.put("exampleAmount", "3 000 €");
        return simulation;
    }


    // ------------------------------------------------------------------ tests

    @Test
    void pageWithSimulation_postsALazyHolderWithoutCallingTheBridge() throws Exception {
        AtomicInteger bridgeCalls = new AtomicInteger();
        RepresentativeExampleBridge bridge = mock(RepresentativeExampleBridge.class);
        when(bridge.getExample(any())).thenAnswer(i -> {
            bridgeCalls.incrementAndGet();
            return simulation();
        });

        HttpServletRequest request = requestWithAttributes();
        SimulationPrepareFilter filter = new SimulationPrepareFilter(bridge, null);

        filter.prepare(contextOn(simulationPage("CR"), request), mock(Resource.class), null);

        Object attribute = request.getAttribute(SimulationPrepareFilter.REQUEST_ATTRIBUTE);
        assertThat(attribute).isInstanceOf(LazySimulationMap.class);
        // Le point capital : rien n'a encore été demandé à l'APIM.
        assertThat(bridgeCalls).hasValue(0);
        assertThat(((LazySimulationMap) attribute).isResolved()).isFalse();
    }

    @Test
    void theHolderResolvesThroughTheBridgeWithThePageNode() throws Exception {
        JCRNodeWrapper page = simulationPage("CR");
        RepresentativeExampleBridge bridge = mock(RepresentativeExampleBridge.class);
        when(bridge.getExample(page)).thenReturn(simulation());

        HttpServletRequest request = requestWithAttributes();
        new SimulationPrepareFilter(bridge, null)
                .prepare(contextOn(page, request), mock(Resource.class), null);

        @SuppressWarnings("unchecked")
        Map<String, Object> holder =
                (Map<String, Object>) request.getAttribute(SimulationPrepareFilter.REQUEST_ATTRIBUTE);

        assertThat(holder).containsEntry("exampleAmount", "3 000 €");
    }

    /**
     * {@code prepare} est invoqué pour chaque fragment, et rien ne garantit que le premier passage
     * porte déjà une ressource principale. Poser le marqueur « déjà tenté » avant de la lire
     * condamnerait la requête entière : les passages suivants, ceux qui en disposent, sortiraient
     * sur le marqueur et la page se rendrait sans simulation — jetons bruts, sans erreur.
     */
    @Test
    void aFirstPassWithoutMainResource_doesNotDisarmTheRequest() throws Exception {
        JCRNodeWrapper page = simulationPage("CR");
        RepresentativeExampleBridge bridge = mock(RepresentativeExampleBridge.class);
        when(bridge.getExample(page)).thenReturn(simulation());

        HttpServletRequest request = requestWithAttributes();
        SimulationPrepareFilter filter = new SimulationPrepareFilter(bridge, null);

        RenderContext withoutMain = mock(RenderContext.class);
        when(withoutMain.getRequest()).thenReturn(request);
        when(withoutMain.getMainResource()).thenReturn(null);

        filter.prepare(withoutMain, mock(Resource.class), null);
        assertThat(request.getAttribute(SimulationPrepareFilter.REQUEST_ATTRIBUTE)).isNull();

        // Le passage suivant dispose de la ressource : il doit encore pouvoir provisionner.
        filter.prepare(contextOn(page, request), mock(Resource.class), null);
        assertThat(request.getAttribute(SimulationPrepareFilter.REQUEST_ATTRIBUTE))
                .isInstanceOf(LazySimulationMap.class);
    }

    @Test
    void pageWithoutMixin_postsNothing() throws Exception {
        JCRNodeWrapper page = mock(JCRNodeWrapper.class);
        when(page.isNodeType("jnt:page")).thenReturn(true);

        HttpServletRequest request = requestWithAttributes();
        new SimulationPrepareFilter(mock(RepresentativeExampleBridge.class), null)
                .prepare(contextOn(page, request), mock(Resource.class), null);

        assertThat(request.getAttribute(SimulationPrepareFilter.REQUEST_ATTRIBUTE)).isNull();
    }

    /** Option cochée mais type de crédit vide : la simulation reste inactive. */
    @Test
    void mixinWithoutProduct_postsNothing() throws Exception {
        HttpServletRequest request = requestWithAttributes();
        new SimulationPrepareFilter(mock(RepresentativeExampleBridge.class), null)
                .prepare(contextOn(simulationPage(null), request), mock(Resource.class), null);

        assertThat(request.getAttribute(SimulationPrepareFilter.REQUEST_ATTRIBUTE)).isNull();
    }

    /**
     * {@code prepare} est invoqué pour chaque fragment. Sans marqueur, une page SANS simulation
     * relancerait la remontée JCR à chaque fois, sur toutes les pages du site.
     */
    @Test
    void resolutionIsAttemptedOnlyOncePerRequest() throws Exception {
        JCRNodeWrapper page = simulationPage("CR");
        AtomicInteger isNodeTypeCalls = new AtomicInteger();
        when(page.isNodeType(SimulationParams.MIXIN)).thenAnswer(i -> {
            isNodeTypeCalls.incrementAndGet();
            return true;
        });

        HttpServletRequest request = requestWithAttributes();
        RenderContext context = contextOn(page, request);
        SimulationPrepareFilter filter =
                new SimulationPrepareFilter(mock(RepresentativeExampleBridge.class), null);

        filter.prepare(context, mock(Resource.class), null);
        filter.prepare(context, mock(Resource.class), null);
        filter.prepare(context, mock(Resource.class), null);

        /*
         * DEUX lectures, pas une : le filtre provisionne deux familles indépendantes — simulation
         * et campagne — et chacune vérifie le mixin pour son propre compte.
         *
         * Ce que ce test verrouille reste le MARQUEUR : sans lui, trois appels à `prepare` en
         * produiraient six. Le chiffre attendu suit donc le nombre de familles, pas le nombre de
         * passages dans la chaîne de rendu.
         */
        assertThat(isNodeTypeCalls).hasValue(2);
    }

    @Test
    void bridgeUnavailable_yieldsAnEmptyHolderInsteadOfFailing() throws Exception {
        HttpServletRequest request = requestWithAttributes();
        new SimulationPrepareFilter(null, null)
                .prepare(contextOn(simulationPage("CR"), request), mock(Resource.class), null);

        @SuppressWarnings("unchecked")
        Map<String, Object> holder =
                (Map<String, Object>) request.getAttribute(SimulationPrepareFilter.REQUEST_ATTRIBUTE);

        assertThat(holder).isEmpty();
    }

    /** Un provisionnement raté ne doit jamais empêcher la page de s'afficher. */
    @Test
    void prepareNeverThrows() {
        RenderContext context = mock(RenderContext.class);
        when(context.getRequest()).thenThrow(new IllegalStateException("plus de requête"));

        SimulationPrepareFilter filter =
                new SimulationPrepareFilter(mock(RepresentativeExampleBridge.class), null);

        assertThat(filter.prepare(context, mock(Resource.class), null)).isNull();
    }

    /**
     * La priorité doit rester SOUS celle du filtre de cache — <b>16.0</b>.
     *
     * <p>C'est {@code AggregateCacheFilter} (16.0) qui tient ce rôle, et non {@code CacheFilter}
     * (16.5) : ce dernier n'est actif que si {@code useNewAggregateAndCacheImplementation} est
     * vrai. Sur l'instance de référence, il est désactivé. La borne retenue est donc la plus
     * basse des deux, ce qui reste valable quelle que soit l'implémentation active.
     *
     * <p>{@code RenderChain} sort de la boucle {@code prepare} dès qu'un filtre renvoie une valeur
     * non nulle, et le filtre de cache répond sur un cache hit. Un filtre placé au-delà ne
     * s'exécuterait donc pas quand le fragment vient du cache — précisément le cas où
     * l'agrégation re-rend des sous-fragments qui ont besoin de l'attribut.
     *
     * <p>Le remonter au-dessus casserait le provisionnement sans qu'aucun autre test ne le voie :
     * la panne serait silencieuse et intermittente, selon l'état du cache.
     */
    @Test
    void priorityStaysBelowTheCacheFilter() {
        float lowestCacheFilterPriority = 16.0f;
        SimulationPrepareFilter filter =
                new SimulationPrepareFilter(mock(RepresentativeExampleBridge.class), null);

        assertThat(filter.getPriority()).isLessThan(lowestCacheFilterPriority);
    }

    /**
     * VERROU DE CONFIGURATION DS — lu dans le BYTECODE, pas dans le texte.
     *
     * <p>Les deux qualificatifs de chaque reference comptent, et pour des raisons differentes :
     *
     * <ul>
     *   <li>{@code OPTIONAL} — le filtre doit s'activer sans les ponts. Une reference obligatoire
     *       le retirerait de la chaine de rendu tant qu'un pont manque.</li>
     *   <li>{@code DYNAMIC} — le defaut, {@code STATIC}, ferait desactiver puis reactiver le
     *       composant a chaque bind/unbind. Pour un {@code RenderFilter}, cela veut dire se
     *       desenregistrer puis se reenregistrer dans la chaine de rendu, exactement le couplage
     *       de cycle de vie que cette forme evite.</li>
     * </ul>
     *
     * <p>Le piege est reel : les trois autres references optionnelles du bundle
     * ({@code CampaignServiceImpl}, {@code CampaignBridgeImpl},
     * {@code RepresentativeExampleBridgeImpl}) s'en remettent au defaut. Recopier ce motif ici
     * reintroduirait le probleme sans qu'aucun autre test ne s'en apercoive.
     *
     * <p><b>Pourquoi ASM, et pas la reflexion.</b> {@code @Reference} porte
     * {@code @Retention(CLASS)} : l'annotation est ECRITE dans le .class, mais le chargeur ne
     * l'expose pas — {@code getAnnotation} renvoie donc toujours {@code null}. Elle vit dans
     * l'attribut {@code RuntimeInvisibleAnnotations}, que seul un lecteur de bytecode atteint.
     * Et le XML DS qui fait foi n'est genere qu'a la phase {@code package}
     * (maven-bundle-plugin), soit apres les tests.
     *
     * <p>Lire le bytecode plutot que la source a un avantage concret : c'est CE QUE LE COMPILATEUR
     * A PRODUIT qui est verifie, donc exactement ce que bnd lira pour ecrire le XML.
     */
    @Test
    void bridgeReferencesStayOptionalAndDynamic() throws Exception {
        Map<String, Map<String, String>> references = readReferenceAnnotations();

        assertThat(references)
                .as("les deux ponts doivent rester des references DS")
                .containsOnlyKeys("exampleBridge", "campaignBridge");

        references.forEach((field, members) -> {
            assertThat(members.get("cardinality"))
                    .as("%s : une reference obligatoire retirerait le filtre de la chaine", field)
                    .isEqualTo("OPTIONAL");
            assertThat(members.get("policy"))
                    .as("%s : STATIC (le defaut) reactiverait le filtre a chaque bind/unbind", field)
                    .isEqualTo("DYNAMIC");
        });
    }

    /**
     * Extrait, pour chaque champ annote {@code @Reference}, les membres a valeur ENUM de
     * l'annotation — {@code cardinality}, {@code policy}, {@code policyOption}.
     *
     * <p>Un membre absent du bytecode signifie « valeur par defaut » : il ne ressort donc pas de
     * la carte, et l'assertion sur {@code null} echoue — ce qui est le comportement voulu, un
     * {@code policy} omis etant precisement le bug a attraper.
     */
    private static Map<String, Map<String, String>> readReferenceAnnotations() throws IOException {
        String resource = SimulationPrepareFilter.class.getName().replace('.', '/') + ".class";
        Map<String, Map<String, String>> found = new LinkedHashMap<>();

        try (InputStream in = SimulationPrepareFilter.class.getClassLoader()
                .getResourceAsStream(resource)) {
            assertThat(in).as("bytecode de SimulationPrepareFilter introuvable").isNotNull();

            new ClassReader(in).accept(new ClassVisitor(Opcodes.ASM9) {
                @Override
                public FieldVisitor visitField(int access, String name, String descriptor,
                                               String signature, Object value) {
                    return new FieldVisitor(Opcodes.ASM9) {
                        @Override
                        public AnnotationVisitor visitAnnotation(String annotationDescriptor,
                                                                 boolean visibleAtRuntime) {
                            if (!REFERENCE_ANNOTATION.equals(annotationDescriptor)) {
                                return null;
                            }
                            Map<String, String> members = found.computeIfAbsent(
                                    name, k -> new LinkedHashMap<>());
                            return new AnnotationVisitor(Opcodes.ASM9) {
                                @Override
                                public void visitEnum(String member, String enumDescriptor,
                                                      String enumConstant) {
                                    members.put(member, enumConstant);
                                }
                            };
                        }
                    };
                }
            }, ClassReader.SKIP_CODE | ClassReader.SKIP_DEBUG | ClassReader.SKIP_FRAMES);
        }
        return found;
    }

    private static final String REFERENCE_ANNOTATION =
            "Lorg/osgi/service/component/annotations/Reference;";

    @Test
    void prepareReturnsNullSoTheChainIsUntouched() throws Exception {
        HttpServletRequest request = requestWithAttributes();
        String out = new SimulationPrepareFilter(mock(RepresentativeExampleBridge.class), null)
                .prepare(contextOn(simulationPage("CR"), request), mock(Resource.class), null);

        assertThat(out).isNull();
    }

    // ------------------------------------------------------------------ campagne

    /**
     * Le porteur de CAMPAGNE est pose independamment de celui de simulation, et reste paresseux :
     * aucun appel APIM tant qu'un jeton n'a pas ete rencontre au rendu.
     */
    @Test
    void pageWithASourceId_postsALazyCampaignHolder() throws Exception {
        AtomicInteger bridgeCalls = new AtomicInteger();
        CampaignBridge campaign = mock(CampaignBridge.class);
        when(campaign.getCampaignVars(any())).thenAnswer(i -> {
            bridgeCalls.incrementAndGet();
            return campaignVars();
        });

        HttpServletRequest request = requestWithAttributes();
        new SimulationPrepareFilter(mock(RepresentativeExampleBridge.class), campaign)
                .prepare(contextOn(withSourceId(simulationPage("CR"), "NEOURL41"), request),
                        mock(Resource.class), null);

        Object attribute = request.getAttribute(SimulationPrepareFilter.CAMPAIGN_REQUEST_ATTRIBUTE);
        assertThat(attribute).isInstanceOf(LazySimulationMap.class);
        assertThat(bridgeCalls).as("rien n'a encore ete demande a l'APIM").hasValue(0);
    }

    @Test
    void theCampaignHolderResolvesThroughItsOwnBridge() throws Exception {
        JCRNodeWrapper page = withSourceId(simulationPage("CR"), "NEOURL41");
        CampaignBridge campaign = mock(CampaignBridge.class);
        when(campaign.getCampaignVars(page)).thenReturn(campaignVars());

        HttpServletRequest request = requestWithAttributes();
        new SimulationPrepareFilter(mock(RepresentativeExampleBridge.class), campaign)
                .prepare(contextOn(page, request), mock(Resource.class), null);

        @SuppressWarnings("unchecked")
        Map<String, Object> holder = (Map<String, Object>)
                request.getAttribute(SimulationPrepareFilter.CAMPAIGN_REQUEST_ATTRIBUTE);

        assertThat(holder).containsEntry("minAmount", "3 001 €");
    }

    /**
     * LE test qui justifie deux porteurs distincts.
     *
     * <p>Une page portant une provenance mais PAS de type de credit doit obtenir ses variables de
     * campagne — et rien d'autre. Exiger le type de credit obligerait un contributeur qui veut
     * seulement afficher les bornes de l'offre a saisir une valeur reglementaire sans objet sur sa
     * page.
     */
    @Test
    void aSourceIdWithoutCreditType_postsOnlyTheCampaignHolder() throws Exception {
        JCRNodeWrapper page = withSourceId(simulationPage(null), "NEOURL41");
        CampaignBridge campaign = mock(CampaignBridge.class);
        when(campaign.getCampaignVars(any())).thenReturn(campaignVars());

        HttpServletRequest request = requestWithAttributes();
        new SimulationPrepareFilter(mock(RepresentativeExampleBridge.class), campaign)
                .prepare(contextOn(page, request), mock(Resource.class), null);

        assertThat(request.getAttribute(SimulationPrepareFilter.CAMPAIGN_REQUEST_ATTRIBUTE))
                .as("la campagne n'exige que la provenance")
                .isInstanceOf(LazySimulationMap.class);
        assertThat(request.getAttribute(SimulationPrepareFilter.REQUEST_ATTRIBUTE))
                .as("la simulation, elle, reste inactive sans type de credit")
                .isNull();
    }

    /** Reciproque : sans provenance, aucun porteur de campagne. */
    @Test
    void aPageWithoutASourceId_postsNoCampaignHolder() throws Exception {
        HttpServletRequest request = requestWithAttributes();
        new SimulationPrepareFilter(mock(RepresentativeExampleBridge.class),
                        mock(CampaignBridge.class))
                .prepare(contextOn(simulationPage("CR"), request), mock(Resource.class), null);

        assertThat(request.getAttribute(SimulationPrepareFilter.CAMPAIGN_REQUEST_ATTRIBUTE)).isNull();
    }

    /**
     * Pont campagne absent du registre OSGi : le porteur est pose mais se resout a vide, plutot
     * que de faire echouer le rendu de la page.
     */
    @Test
    void campaignBridgeUnavailable_yieldsAnEmptyHolder() throws Exception {
        HttpServletRequest request = requestWithAttributes();
        new SimulationPrepareFilter(mock(RepresentativeExampleBridge.class), null)
                .prepare(contextOn(withSourceId(simulationPage("CR"), "NEOURL41"), request),
                        mock(Resource.class), null);

        @SuppressWarnings("unchecked")
        Map<String, Object> holder = (Map<String, Object>)
                request.getAttribute(SimulationPrepareFilter.CAMPAIGN_REQUEST_ATTRIBUTE);

        assertThat(holder).isEmpty();
    }
}
