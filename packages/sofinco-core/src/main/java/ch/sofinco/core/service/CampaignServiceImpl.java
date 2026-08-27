package ch.sofinco.core.service;

import ch.sofinco.core.cache.KeyedLocks;
import ch.sofinco.core.client.ApimSimulationClient;
import ch.sofinco.core.config.RepresentativeExampleConfig;
import ch.sofinco.core.exception.ApimException;
import ch.sofinco.core.model.representativeexample.CampaignResponse;
import ch.sofinco.core.observability.CorrelationIdContext;
import ch.sofinco.core.observability.MetricsRecorder;
import net.sf.ehcache.CacheManager;
import org.apache.commons.lang3.StringUtils;
import org.jahia.services.cache.CacheProvider;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Deactivate;
import org.osgi.service.component.annotations.Modified;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.osgi.service.component.annotations.ReferencePolicy;
import org.osgi.service.component.annotations.ReferencePolicyOption;
import org.osgi.service.component.annotations.ServiceScope;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Implémentation de {@link CampaignService}.
 *
 * <p>Même architecture que {@link RepresentativeExampleServiceImpl} — cache à deux fenêtres, verrou
 * par clé, garde-fou de frontière — mais un régime différent : la clé est la seule provenance, et
 * la fenêtre de fraîcheur se compte en dizaines de minutes plutôt qu'en minutes.
 *
 * <p>Partage volontairement le PID {@code ch.sofinco.core.repex} : les deux services décrivent la
 * même chose du point de vue de l'exploitation — « comment le site interroge l'APIM de simulation »
 * — et un second écran de configuration pour trois propriétés obligerait à chercher à deux endroits
 * le jour d'un incident.
 */
@Component(
        service = CampaignService.class,
        immediate = true,
        scope = ServiceScope.SINGLETON,
        configurationPid = "ch.sofinco.core.repex"
)
// Volontairement SANS `@Designate` : l'OCD est déjà déclaré par RepresentativeExampleServiceImpl
// pour ce même PID, et bnd refuse un PID déclaré deux fois — « Duplicate pid ch.sofinco.core.repex ».
// Le `configurationPid` ci-dessus suffit à recevoir la configuration typée ; `@Designate` ne sert
// qu'à rattacher la description de métatype, et une seule déclaration produit un écran unique,
// ce qui est précisément l'intention.
public class CampaignServiceImpl implements CampaignService {

    private static final Logger LOG = LoggerFactory.getLogger(CampaignServiceImpl.class);

    private static final Duration DEFAULT_FRESH_WINDOW = Duration.ofSeconds(1800);
    private static final Duration DEFAULT_LAST_GOOD_TTL = Duration.ofMinutes(240);
    private static final int DEFAULT_MAX_ENTRIES = 64;

    /** Même dimensionnement que le service d'exemple : les provenances sont peu nombreuses. */
    private static final int APIM_LOCK_STRIPES = 16;

    /**
     * Nom du compteur de servings — tag {@code source} : {@code cache} (fenetre fraiche),
     * {@code apim} (appel reussi), {@code rescue} (derniere campagne valide servie apres echec)
     * ou {@code none} (rien a servir).
     */
    static final String METRIC_CAMPAIGN_SERVED = "campaign.served";

    private final KeyedLocks apimLocks = new KeyedLocks(APIM_LOCK_STRIPES);
    private final ExampleCacheFactory cacheFactory;
    private final Clock clock;

    /** Remplacés en bloc par {@link #apply} — jamais mutés en place. */
    private final AtomicReference<LastGoodCampaignCache> cache = new AtomicReference<>();
    private volatile Duration freshWindow = DEFAULT_FRESH_WINDOW;

    @Reference
    private ApimService apimService;

    @Reference
    private ApimSimulationClient simulationClient;

    /**
     * Voir {@link RepresentativeExampleServiceImpl} pour le détail : c'est {@code CacheProvider} et
     * non {@code CacheService} qui est publié au registre OSGi, et sa méthode
     * {@link CacheProvider#getCacheManager()} est une méthode par défaut qui peut renvoyer
     * {@code null}. D'où une référence OPTIONNELLE et un repli autonome.
     */
    /*
     * `policy = DYNAMIC` N'EST PAS COSMETIQUE ICI.
     *
     * Le defaut, STATIC, fait DESACTIVER puis REACTIVER le composant a chaque bind/unbind — et
     * GREEDY sur une reference OPTIONAL provoque justement un rebind des qu'un service arrive ou
     * qu'un mieux classe le remplace. Or `@Deactivate` appelle `cacheFactory.dispose()`, qui
     * retire le cache du gestionnaire, et `@Activate` en reconstruit un vide.
     *
     * Autrement dit : sans DYNAMIC, un simple redemarrage du `LoggingMetricsRecorder` detruit le
     * cache de secours dernier-bon — celui qui vaut 4 h et dont la raison d'etre est precisement
     * de survivre a une panne APIM. DYNAMIC laisse DS reaffecter le champ sans toucher au cycle
     * de vie ; les deux champs sont deja `volatile` pour cela.
     *
     * Contrepartie assumee sur `cacheProvider` : il n'est lu que dans `apply()`. Un CacheProvider
     * arrivant APRES l'activation ne declenche donc plus de reconstruction, et le cache reste
     * dans le gestionnaire prive jusqu'au prochain changement de configuration. C'est le bon
     * compromis : ce gestionnaire reste liste dans /tools/cache.jsp et purgeable a la main
     * (cf. ExampleCacheFactory), la ou perdre le secours ne se rattrape pas.
     */
    @SuppressWarnings("java:S3077")
    @Reference(
            cardinality = ReferenceCardinality.OPTIONAL,
            policy = ReferencePolicy.DYNAMIC,
            policyOption = ReferencePolicyOption.GREEDY
    )
    private volatile CacheProvider cacheProvider;

    @SuppressWarnings("java:S3077")
    @Reference(
            cardinality = ReferenceCardinality.OPTIONAL,
            policy = ReferencePolicy.DYNAMIC,
            policyOption = ReferencePolicyOption.GREEDY
    )
    private volatile MetricsRecorder metricsRecorder;

    /** Constructeur OSGi. */
    public CampaignServiceImpl() {
        this(null, null, Clock.systemUTC(), (CacheManager) null);
    }

    /** Seam de test : le {@code CacheManager} est fourni, sans registre OSGi. */
    CampaignServiceImpl(ApimService apimService, ApimSimulationClient simulationClient,
                        Clock clock, CacheManager cacheManager) {
        this.apimService = apimService;
        this.simulationClient = simulationClient;
        this.clock = clock;
        this.cacheFactory = new ExampleCacheFactory(cacheManager, ExampleCacheFactory.CAMPAIGN_CACHE_NAME);
    }

    @Activate
    public void activate(RepresentativeExampleConfig config) {
        apply(config);
        LOG.info("CampaignService activé — fraîcheur {} s, secours {} min, plafond {}",
                freshWindow.getSeconds(), config.campaignLastGoodTtlMinutes(), config.campaignMaxEntries());
    }

    @Modified
    public void modified(RepresentativeExampleConfig config) {
        apply(config);
        LOG.info("CampaignService reconfiguré — cache vidé, fraîcheur {} s", freshWindow.getSeconds());
    }

    private void apply(RepresentativeExampleConfig config) {
        // Valeurs hors bornes : on retombe sur les défauts. Une faute de frappe en configuration ne
        // doit pas priver une mention légale de son filet de secours.
        int windowSeconds = Math.max(0, config.campaignFreshWindowSeconds());
        int ttlMinutes = config.campaignLastGoodTtlMinutes() > 0
                ? config.campaignLastGoodTtlMinutes()
                : (int) DEFAULT_LAST_GOOD_TTL.toMinutes();
        int maxEntries = config.campaignMaxEntries() > 0
                ? config.campaignMaxEntries()
                : DEFAULT_MAX_ENTRIES;

        Duration ttl = Duration.ofMinutes(ttlMinutes);
        Duration window = Duration.ofSeconds(windowSeconds);
        if (window.compareTo(ttl) > 0) {
            LOG.warn("Fenêtre de fraîcheur campagne ({} s) supérieure au secours ({} min) — "
                   + "l'excédent est sans effet", windowSeconds, ttlMinutes);
        }

        this.freshWindow = window;
        this.cache.set(cacheFactory.createCampaignCache(cacheProvider, maxEntries, ttl, clock));
    }

    /** Vide le cache à l'arrêt du bundle — voir {@link ExampleCacheFactory#dispose()}. */
    @Deactivate
    public void deactivate() {
        cacheFactory.dispose();
    }

    @Override
    public Optional<CampaignResponse> getCampaign(String sourceId, String product,
                                                  String requestOrigin) {
        try (CorrelationIdContext.Scope ignored =
                     CorrelationIdContext.openWith(CorrelationIdContext.current())) {
            return doGetCampaign(sourceId, product, requestOrigin);
        }
    }

    private Optional<CampaignResponse> doGetCampaign(String sourceId, String product,
                                                     String requestOrigin) {
        if (StringUtils.isBlank(sourceId)) {
            return Optional.empty();
        }

        /*
         * Le garde-fou couvre TOUT, validation comprise : `isReady()` interroge un service externe
         * et peut lever. Une RuntimeException atteignant la frontière JS de Jahia y cascade en
         * « bodyEndTag is null », qui casse la page entière et non le seul fragment.
         */
        try {
            if (!apimService.isReady()) {
                LOG.warn("APIM non prêt — campagne {} non résolue", sourceId);
                recordServed("none");
                return Optional.empty();
            }

            LastGoodCampaignCache store = cache.get();

            /*
             * Le cache ne concerne QUE les appels APIM réels. En mock, une réponse fabriquée ne doit
             * pas survivre à un basculement vers l'APIM réel.
             */
            if (store == null || apimService.isMockMode()) {
                return callAndServe(sourceId, product, requestOrigin, null);
            }

            Optional<CampaignResponse> fresh = store.getFresh(sourceId, freshWindow);
            if (fresh.isPresent()) {
                recordServed("cache");
                return fresh;
            }

            /*
             * Un seul appel en vol par provenance : la rafale de reprise après purge s'effondre en
             * une requête. Les threads en attente relisent le cache à leur réveil.
             *
             * La clé — cache comme verrou — reste la SEULE provenance. Le produit ne sert qu'à
             * choisir la racine APIM, et les deux renvoient la même campagne : l'ajouter à la clé
             * dupliquerait les entrées sans jamais changer la valeur.
             */
            synchronized (apimLocks.forKey(sourceId)) {
                fresh = store.getFresh(sourceId, freshWindow);
                if (fresh.isPresent()) {
                    recordServed("cache");
                    return fresh;
                }
                return callAndServe(sourceId, product, requestOrigin, store);
            }
        } catch (RuntimeException e) {
            LOG.error("Erreur inattendue campagne (sourceId={}) : {}", sourceId, e.getMessage(), e);
            recordServed("none");
            return Optional.empty();
        }
    }

    private Optional<CampaignResponse> callAndServe(String sourceId, String product,
                                                    String requestOrigin,
                                                    LastGoodCampaignCache store) {
        try {
            Optional<CampaignResponse> response =
                    simulationClient.callCampaignApi(sourceId, product,
                            resolveEffectiveOrigin(requestOrigin));
            if (response.isPresent()) {
                if (store != null) {
                    store.put(sourceId, response.get());
                }
                recordServed("apim");
                return response;
            }
            LOG.warn("Campagne {} : réponse APIM vide", sourceId);
        } catch (ApimException | IOException e) {
            // Les deux exceptions CONTRÔLÉES que le client déclare. Les nommer plutôt que
            // d'attraper `Exception` évite d'avaler au passage une erreur de programmation.
            LOG.warn("Campagne {} indisponible ({}) — repli sur la dernière valide",
                    sourceId, e.getMessage());
        } catch (RuntimeException e) {
            // Défaillance inattendue : elle ne doit pas davantage franchir la frontière JS, mais
            // elle se journalise au niveau ERROR — c'est un défaut, pas un incident de service.
            LOG.error("Erreur inattendue sur la campagne {} : {}", sourceId, e.getMessage(), e);
        }

        // SECOURS : la dernière campagne valide reste servable, même périmée pour la fenêtre
        // nominale. Une mention légale amputée de ses bornes est pire qu'une borne de la veille.
        if (store != null) {
            Optional<CampaignResponse> rescue = store.get(sourceId);
            if (rescue.isPresent()) {
                recordServed("rescue");
                return rescue;
            }
        }
        recordServed("none");
        return Optional.empty();
    }

    private String resolveEffectiveOrigin(String requestOrigin) {
        String configOrigin = apimService.getOrigin();
        if (StringUtils.isNotBlank(configOrigin)) {
            return configOrigin;
        }
        if (StringUtils.isNotBlank(requestOrigin)) {
            return requestOrigin;
        }
        return null;
    }

    private void recordServed(String source) {
        MetricsRecorder rec = metricsRecorder;
        if (rec == null) {
            return;
        }
        rec.increment(METRIC_CAMPAIGN_SERVED, "source", source);
    }
}
