package ch.sofinco.core.service;

import ch.sofinco.core.cache.EhcacheStoreFactory;
import ch.sofinco.core.cache.KeyedLocks;
import ch.sofinco.core.client.ApimSimulationClient;
import ch.sofinco.core.config.RepresentativeExampleConfig;
import ch.sofinco.core.enums.CreditVariant;
import ch.sofinco.core.exception.ApimException;
import ch.sofinco.core.mapper.RepresentativeExampleMapper;
import ch.sofinco.core.model.representativeexample.LoanCalculateResponse;
import ch.sofinco.core.model.representativeexample.RepresentativeExample;
import ch.sofinco.core.model.representativeexample.RevolvingCalculateResponse;
import ch.sofinco.core.model.representativeexample.SimulationRequest;
import ch.sofinco.core.observability.CorrelationIdContext;
import ch.sofinco.core.observability.MetricsRecorder;
import ch.sofinco.core.util.JcrReads;
import net.sf.ehcache.CacheManager;
import org.apache.commons.lang3.StringUtils;
import org.jahia.services.cache.CacheProvider;
import org.jahia.services.content.JCRNodeWrapper;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Deactivate;
import org.osgi.service.component.annotations.Modified;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.osgi.service.component.annotations.ReferencePolicyOption;
import org.osgi.service.component.annotations.ServiceScope;
import org.osgi.service.metatype.annotations.Designate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Orchestrateur de l'exemple représentatif : valide les entrées, résout les valeurs par défaut
 * depuis le JCR, appelle l'APIM via {@link ApimSimulationClient}, mappe via
 * {@link RepresentativeExampleMapper}, et ressert un last-good en cas d'échec APIM (mention légale
 * obligatoire — ne doit jamais disparaître sur incident transitoire).
 *
 * <p>Garde-fou : {@code catch (RuntimeException)} couvre toute la méthode {@link #getExample}
 * — aucune exception ne doit remonter au moteur JS Jahia (cascade « bodyEndTag is null »).
 *
 * <p>Le cache ne concerne <b>que</b> les appels APIM réels — pas en mock (risque conformité :
 * une réponse mock figée ne doit pas survivre à un basculement live).
 *
 * <h2>Observabilité</h2>
 *
 * <ul>
 *   <li><b>correlationId MDC</b> : posé en entrée de {@link #getExample(SimulationRequest)} via
 *       {@link CorrelationIdContext}, propagé à tous les logs descendants ({@link ApimHttpExecutor}
 *       réémet sur sa propre clé {@code Correlationid} HTTP).</li>
 *   <li><b>Compteurs Micrometer-compatibles</b> via {@link MetricsRecorder} : {@code repex.served}
 *       avec tag {@code source=apim|cache|last-good|none}. Le ratio {@code last-good} vs
 *       {@code apim} est un indicateur d'incident ; le ratio {@code cache} mesure le gain du
 *       dédoublonnage.</li>
 * </ul>
 */
@Component(
        service = RepresentativeExampleService.class,
        immediate = true,
        scope = ServiceScope.SINGLETON,
        configurationPid = "ch.sofinco.core.repex"
)
@Designate(ocd = RepresentativeExampleConfig.class)
public class RepresentativeExampleServiceImpl implements RepresentativeExampleService {

    private static final Logger LOG = LoggerFactory.getLogger(RepresentativeExampleServiceImpl.class);

    private static final String PROP_DEFAULT_AMOUNT   = "defaultAmount";
    private static final String PROP_DEFAULT_DURATION = "defaultDuration";

    /*
     * DERNIER ETAGE de la cascade page -> `sofnt:representativeExampleConfig` -> ici.
     *
     * Miroir des defauts du CND de ce noeud de config : il ne sert que tant qu'aucun noeud n'a
     * ete cree, ou qu'il ne porte pas la propriete. Les deux valeurs sont les seules rondes
     * valides pour les TROIS produits — 5 000 EUR tient dans [150, 10 000] du CR comme dans
     * [3 001, 75 000] du PB et [3 001, 100 000] du RAC ; 48 mois sort du plancher exact du RAC
     * (36) tout en restant sous le plafond du CR (60).
     */
    private static final long DEFAULT_AMOUNT = 5000L;
    private static final long DEFAULT_DURATION = 48L;

    /** Défauts, appliqués tant qu'aucune configuration OSGi n'est déposée. */
    private static final Duration DEFAULT_LAST_GOOD_TTL = Duration.ofMinutes(30);
    private static final Duration DEFAULT_FRESH_WINDOW = Duration.ofSeconds(60);
    private static final int DEFAULT_MAX_ENTRIES = 256;

    /** 16 bandes pour une cardinalité de quelques dizaines de configurations : collisions rares. */
    private static final int APIM_LOCK_STRIPES = 16;

    /** Nom du compteur de servings — tags {@code source}, {@code variant}, {@code product}. */
    static final String METRIC_REPEX_SERVED = "repex.served";

    private final RepresentativeExampleMapper mapper;
    private final KeyedLocks apimLocks = new KeyedLocks(APIM_LOCK_STRIPES);

    /** Conservée pour reconstruire le cache à chaque reconfiguration. */
    private final Clock clock;

    /** Toute la négociation du magasin ehcache avec la plateforme vit là. */
    private final ExampleCacheFactory cacheFactory;

    /** Remplacés en bloc par {@link #apply} — jamais mutés en place. */
    private final AtomicReference<LastGoodExampleCache> lastGoodCache = new AtomicReference<>();
    private volatile Duration freshWindow = DEFAULT_FRESH_WINDOW;

    @Reference
    private ApimService apimService;

    @Reference
    private ApimSimulationClient simulationClient;

    /**
     * Accès au {@code CacheManager} ehcache de Jahia.
     *
     * <p><b>C'est {@code CacheProvider} et non {@code CacheService}.</b> Le pont
     * {@code JahiaCoreSpringBridge} n'expose au registre OSGi que le bean {@code ehCacheProvider},
     * sous cette interface ; déclarer une référence sur {@code CacheService} ne serait jamais
     * satisfait et ferait disparaître ce service de la plateforme.
     *
     * <p><b>OPTIONNELLE, délibérément.</b> Ce cache est une optimisation : il ne doit en aucun cas
     * conditionner l'activation du service. Une référence obligatoire ferait disparaître l'exemple
     * représentatif — donc une mention légale — le jour où le fournisseur n'est pas là. De plus
     * {@link CacheProvider#getCacheManager()} est une méthode PAR DÉFAUT qui renvoie {@code null} :
     * une implémentation autre que {@code EhCacheProvider} ne la surcharge pas nécessairement.
     * Voir {@link ExampleCacheFactory}.
     */
    // `volatile` imposé par Declarative Services : le conteneur injecte et retire la référence
    // dans le champ lui-même, qui doit donc porter le type du service (OSGi Compendium 112.3.8).
    @SuppressWarnings("java:S3077")
    @Reference(
            cardinality = ReferenceCardinality.OPTIONAL,
            policyOption = ReferencePolicyOption.GREEDY
    )
    private volatile CacheProvider cacheProvider;

    /**
     * Recorder de métriques optionnel — si aucune impl n'est enregistrée dans le runtime OSGi,
     * on utilise {@link MetricsRecorder#NOOP}, le service reste fonctionnel et silencieux.
     */
    // `volatile` imposé par Declarative Services : le conteneur injecte et retire la référence
    // dans le champ lui-même, qui doit donc porter le type du service (OSGi Compendium 112.3.8).
    @SuppressWarnings("java:S3077")
    @Reference(
            cardinality = ReferenceCardinality.OPTIONAL,
            policyOption = ReferencePolicyOption.GREEDY
    )
    private volatile MetricsRecorder metricsRecorder;

    /** Constructeur OSGi. */
    public RepresentativeExampleServiceImpl() {
        this.mapper = new RepresentativeExampleMapper();
        this.clock = Clock.systemUTC();
        this.cacheFactory = new ExampleCacheFactory(null);
    }

    /** Seam de test : injecte les collaborateurs + horloge fixe pour tester l'expiration last-good. */
    RepresentativeExampleServiceImpl(ApimService apimService,
                                     ApimSimulationClient simulationClient,
                                     RepresentativeExampleMapper mapper,
                                     Clock clock) {
        this(apimService, simulationClient, mapper, clock, null, EhcacheStoreFactory.standaloneManager());
    }

    /** Seam de test étendu : injecte aussi le recorder de métriques. */
    RepresentativeExampleServiceImpl(ApimService apimService,
                                     ApimSimulationClient simulationClient,
                                     RepresentativeExampleMapper mapper,
                                     Clock clock,
                                     MetricsRecorder metricsRecorder) {
        this(apimService, simulationClient, mapper, clock, metricsRecorder, EhcacheStoreFactory.standaloneManager());
    }

    /**
     * Seam de test le plus large. Le {@code CacheManager} est fourni par le test — en production
     * il vient de {@link #cacheProvider}, résolu à l'activation.
     */
    RepresentativeExampleServiceImpl(ApimService apimService,
                                     ApimSimulationClient simulationClient,
                                     RepresentativeExampleMapper mapper,
                                     Clock clock,
                                     MetricsRecorder metricsRecorder,
                                     CacheManager cacheManager) {
        this.apimService = apimService;
        this.simulationClient = simulationClient;
        this.mapper = mapper;
        this.clock = clock;
        this.cacheFactory = new ExampleCacheFactory(cacheManager);
        this.metricsRecorder = metricsRecorder;
        applyDefaults();
    }

    @Activate
    public void activate(RepresentativeExampleConfig config) {
        apply(config);
        LOG.info("RepresentativeExampleService activé — fraîcheur {} s, secours {} min, plafond {}",
                freshWindow.getSeconds(), config.lastGoodTtlMinutes(), config.maxEntries());
    }

    /**
     * Reconfiguration à chaud. Le cache est reconstruit et vidé : la nouvelle politique s'applique
     * immédiatement. Le vidage régulier, lui, n'a plus besoin de ce détour — le cache vit dans le
     * {@code CacheManager} de Jahia, que {@code CacheHelper.flushAllCaches} parcourt et propage au
     * cluster.
     */
    @Modified
    public void modified(RepresentativeExampleConfig config) {
        apply(config);
        LOG.info("RepresentativeExampleService reconfiguré — cache vidé, fraîcheur {} s",
                freshWindow.getSeconds());
    }

    private void apply(RepresentativeExampleConfig config) {
        // Valeurs hors bornes : on retombe sur les défauts plutôt que de désactiver le secours
        // d'une mention légale obligatoire sur une faute de frappe en configuration.
        int windowSeconds = Math.max(0, config.freshWindowSeconds());
        int ttlMinutes = config.lastGoodTtlMinutes() > 0
                ? config.lastGoodTtlMinutes()
                : (int) DEFAULT_LAST_GOOD_TTL.toMinutes();
        int maxEntries = config.maxEntries() > 0 ? config.maxEntries() : DEFAULT_MAX_ENTRIES;

        if (windowSeconds > ttlMinutes * 60L) {
            LOG.warn("Fenêtre de fraîcheur ({} s) au-delà du secours ({} min) — le secours ne servira "
                    + "jamais. Vérifiez la configuration.", windowSeconds, ttlMinutes);
        }

        this.freshWindow = Duration.ofSeconds(windowSeconds);
        var ttl = Duration.ofMinutes(ttlMinutes);
        this.lastGoodCache.set(cacheFactory.create(cacheProvider, maxEntries, ttl, clock));
    }

    /** Défauts appliqués par les seams de test, qui n'appellent pas {@link #activate}. */
    private void applyDefaults() {
        this.freshWindow = DEFAULT_FRESH_WINDOW;
        this.lastGoodCache.set(cacheFactory.create(
                cacheProvider, DEFAULT_MAX_ENTRIES, DEFAULT_LAST_GOOD_TTL, clock));
    }

    /** Vide le cache à l'arrêt du bundle — voir {@link ExampleCacheFactory#dispose()}. */
    @Deactivate
    public void deactivate() {
        cacheFactory.dispose();
    }


    @Override
    public Optional<RepresentativeExample> getExample(SimulationRequest request) {
        // Scope MDC : tous les logs descendants porteront correlationId=<UUID>. Si l'amont
        // (bridge) a déjà ouvert un scope, on le préserve via openWith(current()).
        try (CorrelationIdContext.Scope ignored = CorrelationIdContext.openWith(CorrelationIdContext.current())) {
            return doGetExample(request);
        }
    }

    private Optional<RepresentativeExample> doGetExample(SimulationRequest request) {
        if (request == null) {
            LOG.warn("SimulationRequest null, exemple représentatif non rendu");
            recordServed("none", null, null);
            return Optional.empty();
        }

        /*
         * Le garde-fou couvre TOUT ce qui suit le contrôle de nullité, y compris la validation.
         * `apimService.isReady()` interroge un service externe, `rejectionReason` et
         * `fromProduct` lisent des propriétés du request : chacun peut lever. Laisser ces trois
         * appels hors d'un try ouvrait un chemin par lequel une RuntimeException atteignait quand
         * même la frontière JS — précisément ce que `failSafe` promet d'empêcher.
         *
         * D'où deux étages gardés plutôt qu'un seul : la résolution de la variante d'abord, le
         * service ensuite. Le premier catch n'a pas encore de variante à journaliser, le second
         * en a toujours une — `variant` n'a donc jamais besoin d'exister à l'état non résolu.
         */
        CreditVariant variant;
        try {
            Optional<String> rejection = rejectionReason(request, apimService.isReady());
            if (rejection.isPresent()) {
                LOG.warn(rejection.get());
                recordServed("none", null, request.product());
                return Optional.empty();
            }
            variant = CreditVariant.fromProduct(request.product());
        } catch (RuntimeException e) {
            return failSafe(request, null, e);
        }

        try {
            JCRNodeWrapper config = request.config();
            long effectiveAmount = resolveAmount(request, config);
            long effectiveDuration = resolveDuration(request, config);
            String insuranceTextOverride = config != null
                    ? JcrReads.readString(config, variant.insuranceJcrProp())
                    : null;

            String effectiveOrigin = resolveEffectiveOrigin(request.requestOrigin());
            String scaleForCall = (variant == CreditVariant.PRET_PERSO) ? request.scaleCode() : null;

            // Le cache ne concerne QUE les appels APIM réels — pas en mock (risque conformité :
            // une réponse mock figée ne doit pas survivre à un basculement live).
            /*
             * Deux exclusions, pour deux raisons distinctes :
             *
             *   - MOCK : une réponse fabriquée ne doit pas survivre à un basculement vers l'APIM
             *     réel.
             *   - HORS LIVE : l'aperçu est la surface où le contributeur VÉRIFIE ses chiffres
             *     avant publication. Lui resservir une valeur mémorisée viderait la vérification
             *     de son sens. Aucun coût : le cache de fragments de Jahia est lui-même inactif
             *     hors live, ce chemin n'est donc jamais celui du volume.
             */
            boolean cacheable = !apimService.isMockMode() && request.isCacheable();
            if (!cacheable) {
                return callAndServe(variant, request, null, false, new CallInputs(effectiveAmount,
                        effectiveDuration, scaleForCall, effectiveOrigin, insuranceTextOverride));
            }

            var cacheKey = new LastGoodExampleCache.Key(
                    variant, request.sourceCode(), effectiveAmount, effectiveDuration,
                    scaleForCall, effectiveOrigin, insuranceTextOverride);

            Optional<RepresentativeExample> fresh = readFresh(cacheKey);
            if (fresh.isPresent()) {
                recordServed("cache", variant, request.product());
                return fresh;
            }

            // Un seul appel en vol par configuration : la rafale de reprise après purge s'effondre
            // en une requête. Les threads en attente relisent le cache au réveil. Le verrou reste
            // actif même quand la fenêtre est désactivée — il ne coûte aucun décalage.
            synchronized (apimLocks.forKey(cacheKey)) {
                fresh = readFresh(cacheKey);
                if (fresh.isPresent()) {
                    recordServed("cache", variant, request.product());
                    return fresh;
                }
                return callAndServe(variant, request, cacheKey, true, new CallInputs(effectiveAmount,
                        effectiveDuration, scaleForCall, effectiveOrigin, insuranceTextOverride));
            }
        } catch (RuntimeException e) {
            return failSafe(request, variant, e);
        }
    }

    /**
     * Garde-fou frontière JS Jahia : aucune RuntimeException ne doit remonter. Le moteur
     * javascript-modules-engine cascaderait sinon en « bodyEndTag is null », qui casse toute la
     * page Jahia et pas seulement le fragment exemple représentatif.
     *
     * @param variant {@code null} quand la levée précède la résolution de la variante
     */
    private Optional<RepresentativeExample> failSafe(SimulationRequest request,
            CreditVariant variant, RuntimeException e) {
        LOG.error("Erreur inattendue exemple représentatif (product={} sourceCode={}) : {}",
                request.product(), request.sourceCode(), e.getMessage(), e);
        recordServed("none", variant, request.product());
        return Optional.empty();
    }

    /**
     * Valide les préconditions de rendu de l'exemple représentatif. Fonction pure : ne journalise
     * pas et n'a aucun effet de bord, elle se contente de renvoyer le motif de rejet éventuel.
     * Visible package pour tests.
     *
     * @return un message décrivant pourquoi l'exemple ne peut être rendu, ou {@link Optional#empty()}
     *         si toutes les préconditions sont satisfaites.
     */
    static Optional<String> rejectionReason(SimulationRequest request, boolean apimReady) {
        var variant = CreditVariant.fromProduct(request.product());
        if (variant == null) {
            return Optional.of(String.format(
                    "Produit inconnu '%s', exemple représentatif non rendu", request.product()));
        }
        if (StringUtils.isBlank(request.sourceCode())) {
            return Optional.of(String.format(
                    "sourceCode vide pour product=%s, exemple non rendu", request.product()));
        }
        if (!apimReady) {
            return Optional.of(String.format(
                    "APIM non prêt (ni mock ni configuré) — exemple non rendu pour product=%s",
                    request.product()));
        }
        return Optional.empty();
    }

    /** Lecture nominale. Fenêtre à zéro = dédoublonnage désactivé, chaque rendu rappelle l'APIM. */
    private Optional<RepresentativeExample> readFresh(LastGoodExampleCache.Key key) {
        Duration window = freshWindow;
        if (window.isZero()) {
            return Optional.empty();
        }
        return lastGoodCache.get().getFresh(key, window);
    }

    /**
     * Appelle l'APIM, mémorise le succès, retombe sur le last-good en cas d'échec.
     *
     * <p>Seuls les succès sont mémorisés : un incident APIM de trente secondes ne doit jamais
     * devenir permanent en figeant une absence de donnée dans le cache.
     *
     * @param cacheKey {@code null} quand {@code cacheable} est faux (mode mock)
     */
    private Optional<RepresentativeExample> callAndServe(CreditVariant variant, SimulationRequest request,
            LastGoodExampleCache.Key cacheKey, boolean cacheable, CallInputs inputs) {
        try {
            Optional<RepresentativeExample> built =
                    callApimAndBuild(variant, request.sourceCode(), inputs);
            if (built.isPresent()) {
                if (cacheable) {
                    lastGoodCache.get().put(cacheKey, built.get());
                }
                recordServed("apim", variant, request.product());
                return built;
            }
            if (cacheable) {
                return serveLastGood(cacheKey, "réponse APIM vide", request, variant);
            }
            recordServed("none", variant, request.product());
            return Optional.empty();
        } catch (ApimException | IOException e) {
            LOG.error("Echec appel APIM v3 pour product={} sourceCode={} : {}",
                    request.product(), request.sourceCode(), e.getMessage(), e);
            if (cacheable) {
                return serveLastGood(cacheKey, "échec appel APIM", request, variant);
            }
            recordServed("none", variant, request.product());
            return Optional.empty();
        }
    }

    private Optional<RepresentativeExample> callApimAndBuild(CreditVariant variant, String sourceCode,
            CallInputs inputs) throws ApimException, IOException {
        long amount = inputs.amount();
        long duration = inputs.duration();
        String scaleForCall = inputs.scaleForCall();
        String origin = inputs.origin();
        String insuranceTextOverride = inputs.insuranceTextOverride();
        if (variant.usesRevolvingApi()) {
            Optional<RevolvingCalculateResponse> resp = simulationClient.callRevolvingApi(sourceCode, amount, duration, origin);
            if (resp.isEmpty() || resp.get().firstProposal() == null) {
                return Optional.empty();
            }
            return Optional.ofNullable(mapper.buildCreditRenouvelable(resp.get(), amount, insuranceTextOverride));
        }
        Optional<LoanCalculateResponse> resp = simulationClient.callLoanApi(sourceCode, amount, duration, scaleForCall, origin);
        if (resp.isEmpty() || resp.get().firstProposal() == null) {
            return Optional.empty();
        }
        RepresentativeExample built = variant == CreditVariant.PRET_PERSO
                ? mapper.buildPretPerso(resp.get(), amount, insuranceTextOverride)
                : mapper.buildRachatCredit(resp.get(), amount, insuranceTextOverride);
        return Optional.ofNullable(built);
    }

    private Optional<RepresentativeExample> serveLastGood(LastGoodExampleCache.Key key,
            String cause, SimulationRequest request, CreditVariant variant) {
        Optional<RepresentativeExample> lastGood = lastGoodCache.get().get(key);
        if (lastGood.isPresent()) {
            LOG.warn("APIM indisponible ({}) pour product={} sourceCode={} — service du last-good",
                    cause, request.product(), request.sourceCode());
            recordServed("last-good", variant, request.product());
            return lastGood;
        }
        LOG.debug("APIM indisponible ({}) sans last-good — exemple non rendu pour product={} sourceCode={}",
                cause, request.product(), request.sourceCode());
        recordServed("none", variant, request.product());
        return Optional.empty();
    }

    private void recordServed(String source, CreditVariant variant, String product) {
        var rec = metricsRecorder;
        if (rec == null) {
            return;
        }
        rec.increment(METRIC_REPEX_SERVED,
                "source", source,
                "variant", variant != null ? variant.name() : "unknown",
                "product", product != null ? product : "unknown");
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

    private long resolveAmount(SimulationRequest request, JCRNodeWrapper config) {
        return (request.amount() != null && request.amount() > 0)
                ? request.amount()
                : JcrReads.readLongOr(config, PROP_DEFAULT_AMOUNT, DEFAULT_AMOUNT);
    }

    private long resolveDuration(SimulationRequest request, JCRNodeWrapper config) {
        return (request.duration() != null && request.duration() > 0)
                ? request.duration()
                : JcrReads.readLongOr(config, PROP_DEFAULT_DURATION, DEFAULT_DURATION);
    }

    /**
     * Paramètres d'appel APIM déjà résolus (valeurs de la requête ou défauts du nœud de config).
     * Regroupés pour que la chaîne d'appel garde une signature lisible.
     */
    private record CallInputs(long amount, long duration, String scaleForCall, String origin,
                              String insuranceTextOverride) {
    }
}
