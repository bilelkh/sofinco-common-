package ch.sofinco.core.render;

import ch.sofinco.core.bridge.CampaignBridge;
import ch.sofinco.core.bridge.RepresentativeExampleBridge;
import ch.sofinco.core.model.representativeexample.CampaignParams;
import ch.sofinco.core.model.representativeexample.SimulationParams;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.jahia.services.render.filter.AbstractFilter;
import org.jahia.services.render.filter.RenderChain;
import org.jahia.services.render.filter.RenderFilter;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.osgi.service.component.annotations.ReferencePolicy;
import org.osgi.service.component.annotations.ReferencePolicyOption;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.http.HttpServletRequest;
import java.util.Map;

/**
 * Pose l'exemple représentatif de la page en attribut de requête, une fois par requête.
 *
 * <p>Tous les consommateurs de la page lisent ce même attribut — le composant
 * {@code sofnt:representativeExample} comme la substitution des jetons {@code {{taea}}} des
 * mentions : un seul calcul par page au lieu d'un par composant.
 *
 * <p>Ne touche jamais au HTML produit. La substitution a lieu côté template-set sur la valeur JCR,
 * avant tout balisage ({@code src/lib/insuranceVars.ts}) — une regex sur le HTML agrégé
 * atteindrait les props JSON des îlots et casserait leur hydratation.
 *
 * <p>Le template-set retombe sur un appel direct au bridge tant que ce filtre n'est pas déployé :
 * même rendu, plus d'appels. Les deux chemins coexistent pendant la bascule.
 */
// Pas de `equals` propre : Jahia trie et dédoublonne la chaîne de filtres avec l'égalité
// définie par AbstractFilter (priorité + identité du filtre). La redéfinir depuis un champ
// de collaboration changerait le comportement de la chaîne de rendu.
@SuppressWarnings("java:S2160")
@Component(service = RenderFilter.class)
// `final` porte du sens : le constructeur appelle les setters de configuration d'AbstractFilter
// (setName, setPriority…). Sans classe finale, une sous-classe pourrait les redéfinir et les voir
// invoqués avant sa propre initialisation.
public final class SimulationPrepareFilter extends AbstractFilter {

    private static final Logger LOG = LoggerFactory.getLogger(SimulationPrepareFilter.class);

    /** Attribut lu par {@code src/lib/insuranceVars.ts} du template-set. */
    public static final String REQUEST_ATTRIBUTE = "sofinco.simulation";

    /**
     * Attribut du porteur de CAMPAGNE, distinct du précédent.
     *
     * <p>Deux porteurs et non un seul enrichi : une page n'utilisant que {@code {minAmount}} ne
     * doit déclencher AUCUN appel de simulation, et réciproquement. Les fusionner détruirait
     * l'intérêt même du mécanisme paresseux.
     */
    public static final String CAMPAIGN_REQUEST_ATTRIBUTE = "sofinco.campaign";

    /**
     * Marqueur « déjà tenté pour cette requête », distinct de l'attribut de donnée : une page SANS
     * simulation ne pose rien, et {@code prepare} est invoqué pour chaque fragment.
     */
    private static final String RESOLVED_MARKER = "sofinco.simulation.resolved";

    /*
     * REFERENCES DS, ET NON UNE RESOLUTION MANUELLE AU REGISTRE.
     *
     * OPTIONAL : le filtre doit s'activer meme sans les ponts. Il se contente alors de ne pas
     * poser le porteur correspondant, et le template-set retombe sur un appel direct — degrade,
     * jamais casse. Une reference obligatoire retirerait le filtre de la chaine de rendu.
     *
     * DYNAMIC, ET C'EST LE POINT DELICAT : le defaut STATIC ferait DESACTIVER puis REACTIVER le
     * composant a chaque bind/unbind. Pour un RenderFilter, cela signifie se desenregistrer puis
     * se reenregistrer dans la chaine de rendu — exactement le couplage de cycle de vie qu'on
     * cherche a eviter. Les trois autres references optionnelles du bundle omettent `policy` ;
     * les recopier ici serait un contresens. Verrouille par
     * `SimulationPrepareFilterTest#bridgeReferencesStayOptionalAndDynamic`.
     *
     * `volatile` + instantane en locale avant test-puis-usage dans `resolve` / `resolveCampaign` :
     * DS peut delier le champ entre le controle de nullite et l'appel.
     */
    @SuppressWarnings("java:S3077")
    @Reference(
            cardinality = ReferenceCardinality.OPTIONAL,
            policy = ReferencePolicy.DYNAMIC,
            policyOption = ReferencePolicyOption.GREEDY
    )
    private volatile RepresentativeExampleBridge exampleBridge;

    @SuppressWarnings("java:S3077")
    @Reference(
            cardinality = ReferenceCardinality.OPTIONAL,
            policy = ReferencePolicy.DYNAMIC,
            policyOption = ReferencePolicyOption.GREEDY
    )
    private volatile CampaignBridge campaignBridge;

    public SimulationPrepareFilter() {
        this(null, null);
    }

    /**
     * Seam de test, et point de configuration unique du filtre — dans le constructeur plutôt qu'un
     * {@code @Activate}, pour qu'aucune fenêtre ne le publie non configuré.
     *
     * <p><b>{@code priority=0.5} doit rester SOUS 16.0.</b> {@code RenderChain} exécute
     * {@code prepare} par priorité croissante et sort dès qu'un filtre renvoie non-{@code null} —
     * ce que fait le filtre de cache sur un hit. Au-delà de 16.0, ce filtre ne s'exécuterait donc
     * plus quand le fragment vient du cache, précisément le cas où l'agrégation re-rend des
     * sous-fragments qui ont besoin de l'attribut. La borne est bien 16.0
     * ({@code AggregateCacheFilter}) et non 16.5 ({@code CacheFilter}), ce dernier n'étant actif
     * que si {@code useNewAggregateAndCacheImplementation} est vrai. Verrouillé par
     * {@code SimulationPrepareFilterTest#priorityStaysBelowTheCacheFilter}.
     *
     * <p>Ni {@code applyOnMainResource} — l'invocation sur la ressource principale n'est pas
     * garantie quand la page vient du cache d'agrégation, et le marqueur assure déjà l'unicité —
     * ni {@code applyOnModes} : le panneau d'audit a besoin du rendu en édition.
     */
    SimulationPrepareFilter(RepresentativeExampleBridge exampleBridge, CampaignBridge campaignBridge) {
        this.exampleBridge = exampleBridge;
        this.campaignBridge = campaignBridge;
        setName("sofincoSimulationPrepareFilter");
        setDescription("Provisionne l'exemple représentatif de la page (paresseux) pour tous ses composants");
        setPriority(0.5f);
        // `wrappedcontent` figure dans les clés de fragments réelles au même titre que `page` et
        // `module` : l'omettre laisserait un fragment de ce type se rendre sans l'attribut, et le
        // template-set retomberait sur un appel direct au bridge — correct, mais un appel de plus.
        setApplyOnConfigurations("page,module,wrappedcontent");
    }

    @Override
    public String prepare(RenderContext renderContext, Resource resource, RenderChain chain) {
        try {
            provision(renderContext);
        } catch (RuntimeException e) {
            // Jamais bloquant : les jetons resteront visibles et l'audit le signalera en édition.
            LOG.warn("Provisionnement de la simulation ignoré : {}", e.getMessage());
        }
        // `null` = sortie inchangée, la chaîne se poursuit.
        return null;
    }

    private void provision(RenderContext renderContext) {
        HttpServletRequest request = renderContext.getRequest();
        if (request == null || request.getAttribute(RESOLVED_MARKER) != null) {
            return;
        }

        /*
         * La ressource principale est lue AVANT de poser le marqueur.
         *
         * `prepare` est invoqué pour chaque fragment, et rien ne garantit que le premier passage
         * porte déjà une ressource principale. Poser le marqueur d'abord condamnerait alors la
         * requête entière : les passages suivants, ceux qui disposent de la ressource, sortiraient
         * sur le marqueur et la page se rendrait sans simulation — jetons bruts, sans erreur.
         */
        var main = renderContext.getMainResource();
        if (main == null) {
            return;
        }
        request.setAttribute(RESOLVED_MARKER, Boolean.TRUE);

        final JCRNodeWrapper page = SimulationParams.findPage(main.getNode());

        /*
         * Les deux familles sont provisionnées INDÉPENDAMMENT, parce que leurs préconditions
         * diffèrent : une simulation exige le type de crédit, une campagne se contente de la
         * provenance. Sortir dès que la simulation est inactive priverait de leurs variables les
         * pages qui n'ont qu'une provenance — et obligerait le contributeur à renseigner un type
         * de crédit qu'il n'utilise pas, alors que ce champ pilote des chiffres réglementés.
         */
        provisionSimulation(request, page);
        provisionCampaign(request, page);
    }

    private void provisionSimulation(HttpServletRequest request, JCRNodeWrapper page) {
        var params = SimulationParams.read(page);
        if (params == null) {
            // Sans mixin ou sans type de crédit : rien posé. Le template-set traite l'absence
            // d'attribut comme « pas de simulation ».
            return;
        }

        if (LOG.isDebugEnabled()) {
            LOG.debug("Simulation provisionnée (paresseuse) pour {} — produit {}",
                    page.getPath(), params.product());
        }

        // Aucun appel APIM ici : c'est tout l'intérêt du porteur paresseux.
        request.setAttribute(REQUEST_ATTRIBUTE, new LazySimulationMap(() -> resolve(page)));
    }

    private void provisionCampaign(HttpServletRequest request, JCRNodeWrapper page) {
        var params = CampaignParams.read(page);
        if (params == null) {
            return;
        }

        if (LOG.isDebugEnabled()) {
            LOG.debug("Campagne provisionnée (paresseuse) pour {} — provenance {}",
                    page.getPath(), params.sourceId());
        }

        request.setAttribute(CAMPAIGN_REQUEST_ATTRIBUTE, new LazySimulationMap(() -> resolveCampaign(page)));
    }

    /** Calcul effectif, déclenché par le premier consommateur. Le bridge reçoit le nœud PAGE. */
    private Map<String, Object> resolve(JCRNodeWrapper page) {
        // Instantane du volatile : DS peut delier entre le test et l'appel.
        RepresentativeExampleBridge bridge = this.exampleBridge;
        if (bridge == null) {
            LOG.warn("RepresentativeExampleBridge indisponible — simulation non calculée pour {}",
                    page.getPath());
            return null;
        }
        return bridge.getExample(page);
    }

    /** Pendant campagne : même paresse, autre pont. */
    private Map<String, Object> resolveCampaign(JCRNodeWrapper page) {
        CampaignBridge bridge = this.campaignBridge;
        if (bridge == null) {
            LOG.warn("CampaignBridge indisponible — campagne non calculée pour {}", page.getPath());
            return null;
        }
        return bridge.getCampaignVars(page);
    }
}
