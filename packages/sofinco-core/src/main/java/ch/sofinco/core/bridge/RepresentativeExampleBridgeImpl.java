package ch.sofinco.core.bridge;

import ch.sofinco.core.enums.CreditVariant;
import ch.sofinco.core.model.representativeexample.RepresentativeExample;
import ch.sofinco.core.model.representativeexample.Row;
import ch.sofinco.core.model.representativeexample.SimulationParams;
import ch.sofinco.core.model.representativeexample.SimulationRequest;
import ch.sofinco.core.observability.CorrelationIdContext;
import ch.sofinco.core.service.RepresentativeExampleService;
import ch.sofinco.core.util.JcrReads;
import org.jahia.api.Constants;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.decorator.JCRSiteNode;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.osgi.service.component.annotations.ReferencePolicyOption;
import org.osgi.service.component.annotations.ServiceScope;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.NodeIterator;
import javax.jcr.RepositoryException;
import javax.jcr.query.Query;
import javax.jcr.query.QueryManager;
import javax.jcr.query.QueryResult;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Implémentation OSGi de {@link RepresentativeExampleBridge}.
 *
 * <p>Responsabilités : lire les propriétés simulateur à plat sur le node du composant et le node
 * de config dans le JCR, résoudre l'Origin via {@link RequestOriginProvider}, appeler le service,
 * puis convertir le record
 * {@link RepresentativeExample} en {@code Map<String,Object>} consommable par TS.
 *
 * <p>Sécurité JCR-SQL2 : la grammaire {@code ISDESCENDANTNODE('path')} n'accepte pas de bind
 * variable, on échappe donc le {@code sitePath} comme littéral SQL2 (doublement des apostrophes).
 * Le {@code nodeType} est validé par regex CND même quand c'est une constante — défense en
 * profondeur. {@code ORDER BY [jcr:path]} garantit un résultat reproductible si plusieurs
 * configs co-existent (oubli éditorial).
 */
@Component(
        service = RepresentativeExampleBridge.class,
        immediate = true,
        scope = ServiceScope.SINGLETON,
        property = "service.description=Bridge OSGi consommé par le mapping TypeScript de sofinco-template"
)
public class RepresentativeExampleBridgeImpl implements RepresentativeExampleBridge {

    private static final Logger LOG = LoggerFactory.getLogger(RepresentativeExampleBridgeImpl.class);

    /** Visible package pour tests (forme CND {@code namespace:localName} garantie par test). */
    static final String CONFIG_NODE_TYPE = "sofnt:representativeExampleConfig";

    // Propriétés EN SURSIS sur sofnt:representativeExample : lues en PRIORITÉ sur celles de la
    // page tant que migrate-simulation-params-to-page.groovy n'a pas été rejoué partout.
    // Disparaissent avec la seconde livraison, en même temps que la cascade.
    private static final String PROP_PRODUCT    = "product";
    private static final String PROP_SOURCE_ID  = "sourceId";
    private static final String PROP_AMOUNT     = "amount";
    private static final String PROP_DUE_NUMBER = "dueNumber";
    private static final String PROP_SCALE_CODE = "scaleCode";


    @Reference
    private RepresentativeExampleService service;

    // `volatile` est ici imposé par Declarative Services : une référence dynamique OPTIONAL est
    // injectée/retirée par le conteneur dans le champ lui-même, qui doit donc porter le type du
    // service (OSGi Compendium 112.3.8). Un AtomicReference casserait l'injection.
    @SuppressWarnings("java:S3077")
    @Reference(
            cardinality = ReferenceCardinality.OPTIONAL,
            policyOption = ReferencePolicyOption.GREEDY
    )
    private volatile RequestOriginProvider originProvider;

    /** Constructeur OSGi. */
    public RepresentativeExampleBridgeImpl() {
        // câblage DS
    }

    /** Seam de test : injecte le service et le fournisseur d'Origin. */
    RepresentativeExampleBridgeImpl(RepresentativeExampleService service,
                                    RequestOriginProvider originProvider) {
        this.service = service;
        this.originProvider = originProvider;
    }

    @Activate
    public void activate() {
        LOG.info("RepresentativeExampleBridge activé");
    }

    @Override
    public Map<String, Object> getExample(JCRNodeWrapper componentNode) {
        // Point d'entrée bridge → on ouvre un scope MDC correlationId. Tous les logs
        // descendants (service, client, executor) portent automatiquement cet identifiant,
        // ce qui permet de tracer une simulation échouée de bout en bout dans Kibana.
        try (CorrelationIdContext.Scope ignored = CorrelationIdContext.open()) {
            if (componentNode == null) {
                LOG.warn("getExample(null) — composant absent, exemple non calculé");
                return null;
            }

            var params = readSimulatorParams(componentNode);
            if (params == null) {
                return null;
            }

            JCRNodeWrapper configNode = findConfigNode(componentNode);
            // Snapshot du volatile pour éviter une race read/use sur unbind DS.
            RequestOriginProvider provider = this.originProvider;
            String requestOrigin = provider != null ? provider.currentOrigin() : null;

            var request = new SimulationRequest(
                    params.sourceId(), params.product(), params.amount(), params.duration(),
                    params.scaleCode(), requestOrigin, configNode, isLiveWorkspace(componentNode));

            Optional<RepresentativeExample> result = service.getExample(request);
            return result.map(this::toJavaScriptMap).orElse(null);
        }
    }

    /**
     * Workspace du nœud rendu — {@code live} en publication, {@code default} en aperçu et en
     * édition. C'est le seul signal de mode disponible ici : le bridge reçoit un nœud, pas un
     * {@code RenderContext}.
     *
     * <p>En cas de doute on renvoie {@code false} : ne pas mettre en cache est toujours sûr,
     * l'inverse non.
     */
    private static boolean isLiveWorkspace(JCRNodeWrapper node) {
        try {
            return Constants.LIVE_WORKSPACE.equals(node.getSession().getWorkspace().getName());
        } catch (RepositoryException | RuntimeException e) {
            LOG.debug("Workspace indéterminé — traité comme non-live : {}", e.getMessage());
            return false;
        }
    }

    // ---------------------------------------------------------------------------------------
    // Résolution du config node via JCR query (P0.4)
    // ---------------------------------------------------------------------------------------

    private JCRNodeWrapper findConfigNode(JCRNodeWrapper componentNode) {
        try {
            JCRSiteNode site = componentNode.getResolveSite();
            if (site == null) {
                LOG.debug("Pas de site résolu pour {}, config node non recherché", componentNode.getPath());
                return null;
            }
            String sitePath = site.getPath();
            String stmt = "SELECT * FROM [" + CONFIG_NODE_TYPE + "] "
                        + "WHERE ISDESCENDANTNODE('" + escapeForSql2Literal(sitePath) + "') "
                        + "ORDER BY [jcr:path]";

            QueryManager qm = componentNode.getSession().getWorkspace().getQueryManager();
            var query = qm.createQuery(stmt, Query.JCR_SQL2);
            QueryResult qResult = query.execute();
            NodeIterator it = qResult.getNodes();

            if (!it.hasNext()) {
                LOG.debug("Aucun {} trouvé dans le site {} — service utilisera fallbacks",
                        CONFIG_NODE_TYPE, sitePath);
                return null;
            }
            JCRNodeWrapper config = (JCRNodeWrapper) it.nextNode();
            if (it.hasNext()) {
                LOG.warn("Plusieurs {} trouvés dans le site {}, utilise le premier (ordre jcr:path) : {}",
                        CONFIG_NODE_TYPE, sitePath, config.getPath());
            }
            return config;
        } catch (RepositoryException e) {
            LOG.warn("Echec recherche config node : {}", e.getMessage());
            return null;
        }
    }

    /**
     * Échappe un littéral pour JCR-SQL2 : double les apostrophes simples
     * ({@code O'Reilly → O''Reilly}). Bind variables impossibles sur
     * {@code ISDESCENDANTNODE}, l'échappement est donc la seule défense disponible.
     * Visible package pour tests.
     */
    static String escapeForSql2Literal(String value) {
        return value == null ? "" : value.replace("'", "''");
    }

    // ---------------------------------------------------------------------------------------
    // Lecture des params simulateur directement sur le node du composant
    // (mixin sofmix:simulatorCta pour product/sourceId, natifs pour amount/dueNumber/scaleCode).
    // Plus de child node `simulator` — la structure est aplatie sur sofnt:representativeExample.
    // ---------------------------------------------------------------------------------------

    /**
     * Lit les paramètres de simulation : le COMPOSANT d'abord, la PAGE englobante ensuite.
     *
     * <p><b>Cascade transitoire.</b> Les paramètres ont migré vers {@code sofmix:simulationParams}
     * sur la page, mais le contenu non encore traité par
     * {@code migrate-simulation-params-to-page.groovy} les porte toujours en propre. Lire la page
     * seule ferait disparaître l'exemple représentatif de ces pages — <b>sans erreur</b>, donc
     * sans que personne ne le voie. Une mention légale absente est plus grave qu'une exception.
     *
     * <p>Le composant l'emporte tant qu'il porte une valeur ; le script de migration l'efface
     * après recopie, et la cascade retombe alors naturellement sur la page. Cette méthode et les
     * constantes {@code PROP_*} disparaîtront avec la seconde livraison.
     *
     * <p>La page est résolue par remontée : le nœud reçu est la page sur le chemin du filtre, mais
     * le composant sur le chemin de repli du template-set. Les deux doivent fonctionner.
     */
    private SimulatorParams readSimulatorParams(JCRNodeWrapper node) {
        var fromPage = SimulationParams.read(SimulationParams.findPage(node));

        SimulatorParams p = fromPage != null ? fromPageParams(fromPage) : legacyComponentParams(node);
        if (p.product() == null || p.product().isEmpty()) {
            if (LOG.isDebugEnabled()) {
                LOG.debug("{} : aucun type de crédit, ni sur la page englobante ni sur le composant",
                        nodePath(node));
            }
            return null;
        }
        if (p.sourceId() == null || p.sourceId().isEmpty()) {
            // Sur une page migrée : `simSourceId` non renseigné dans les Options, la simulation ne
            // peut pas être demandée à l'APIM. Le template-set laissera les jetons visibles et son
            // panneau d'audit le signalera en édition.
            if (LOG.isWarnEnabled()) {
                LOG.warn("{} sans sourceId — exemple non rendu", nodePath(node));
            }
            return null;
        }
        return p;
    }

    private static SimulatorParams fromPageParams(SimulationParams source) {
        return new SimulatorParams(source.product(), source.sourceId(), source.amount(),
                source.duration(), source.scaleCode());
    }

    /**
     * Repli transitoire sur les propriétés portées par le composant lui-même.
     *
     * <p>Atteint uniquement quand la page n'a PAS de simulation exploitable — donc sur du contenu
     * que {@code migrate-simulation-params-to-page.groovy} n'a pas encore traité. Sans ce repli,
     * l'exemple représentatif disparaîtrait de ces pages <b>sans erreur</b> : une mention légale
     * absente ne se voit pas, contrairement à une exception.
     *
     * <p>Tout-ou-rien, et non champ par champ : mélanger les deux sources produirait une
     * configuration composite que personne n'a saisie. Disparaît avec la seconde livraison.
     */
    private static SimulatorParams legacyComponentParams(JCRNodeWrapper node) {
        return new SimulatorParams(
                JcrReads.readString(node, PROP_PRODUCT),
                JcrReads.readString(node, PROP_SOURCE_ID),
                JcrReads.readLong(node, PROP_AMOUNT),
                JcrReads.readLong(node, PROP_DUE_NUMBER),
                JcrReads.readString(node, PROP_SCALE_CODE));
    }



    /** Chemin lisible pour la journalisation, sans faire échouer le log lui-même. */
    private static String nodePath(JCRNodeWrapper node) {
        try {
            return node.getPath();
        } catch (RuntimeException e) {
            LOG.debug("Impossible de lire le chemin du nœud pour la journalisation", e);
            return "(chemin indisponible)";
        }
    }

    // ---------------------------------------------------------------------------------------
    // Conversion RepresentativeExample → Map<String, Object> (JS-friendly)
    // ---------------------------------------------------------------------------------------

    private Map<String, Object> toJavaScriptMap(RepresentativeExample ex) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("variant", variantToString(ex.variant()));
        out.put("exampleAmount", nullSafe(ex.exampleAmount()));
        out.put("rows", rowsToList(ex.rows()));
        out.put("insurance", ex.insurance() != null
                ? new LinkedHashMap<>(ex.insurance()) : new LinkedHashMap<>());
        out.put("insuranceTextOverride", nullSafe(ex.insuranceTextOverride()));
        return out;
    }

    private static String variantToString(CreditVariant v) {
        return v != null ? v.jsString() : null;
    }

    private static List<Map<String, Object>> rowsToList(Collection<Row> rows) {
        if (rows == null) {
            return new ArrayList<>();
        }
        // Une ligne de sortie par ligne d'entrée : la taille finale est connue d'avance, autant
        // éviter les redimensionnements successifs du tableau interne.
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (Row r : rows) {
            Map<String, Object> rowMap = new LinkedHashMap<>();
            rowMap.put("labelKey", nullSafe(r.labelKey()));
            rowMap.put("value", nullSafe(r.value()));
            rowMap.put("highlighted", r.highlighted());
            rowMap.put("labelParam", r.labelParam());
            out.add(rowMap);
        }
        return out;
    }

    private static String nullSafe(String s) {
        return s == null ? "" : s;
    }

    /** Les cinq paramètres d'une simulation, quelle que soit la source qui les a fournis. */
    private record SimulatorParams(String product, String sourceId, Long amount, Long duration,
                                   String scaleCode) {
    }
}
