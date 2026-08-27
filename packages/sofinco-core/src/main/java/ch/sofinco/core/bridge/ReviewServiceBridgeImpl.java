package ch.sofinco.core.bridge;

import ch.sofinco.core.cache.EhcacheStoreFactory;
import ch.sofinco.core.cache.KeyedLocks;
import ch.sofinco.core.cache.TtlCache;
import ch.sofinco.core.client.http.HttpClientFactory;
import ch.sofinco.core.config.ReviewCacheConfig;
import ch.sofinco.core.util.JsonFacade;
import ch.sofinco.core.util.LogSanitizer;
import com.fasterxml.jackson.databind.JsonNode;
import fr.sofinco.portal.jahia.model.AverageRate;
import fr.sofinco.portal.jahia.services.ReviewService;
import net.sf.ehcache.CacheManager;
import net.sf.ehcache.Ehcache;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.jahia.services.cache.CacheProvider;
import org.jahia.services.content.JCRNodeWrapper;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Deactivate;
import org.osgi.service.component.annotations.Modified;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.osgi.service.component.annotations.ReferencePolicyOption;
import org.osgi.service.metatype.annotations.Designate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

/**
 * Implémentation OSGi de {@link ReviewServiceBridge} — bridge vers le singleton statique
 * {@link ReviewService} de {@code portal-common-sofinco}.
 *
 * <p>Pourquoi ce bridge : le runtime JS Jahia ne peut résoudre des types Java que via le registre
 * OSGi (cf. {@code server.osgi.getService(...)}). Le {@link ReviewService} en amont est un
 * singleton statique non-OSGi, vivant dans un autre bundle invisible au moteur JS.
 *
 * <p>Cette impl convertit aussi les résultats {@link JsonNode} Jackson en {@link Map}/{@link List}
 * "plats" pour que le côté JS ne touche jamais à une classe hôte Jackson (refusée par l'allowlist
 * GraalVM host-access).
 *
 * <h2>Defensive wrapping</h2>
 *
 * <p>Le {@code ReviewService} amont est un legacy qui peut lever des unchecked quand l'API revue
 * distante est down, renvoie du non-JSON (ex. page de login du proxy corporate), ou un
 * {@link NumberFormatException} sur des données malformées. Cet impl catch tout, log un WARN
 * unique avec la cause racine, et renvoie un fallback bénin ({@code null} ou liste vide).
 *
 * <h2>Cache</h2>
 *
 * <p>Chaque appel amont est un aller-retour HTTP. Sur une page produit rendue à froid, le moteur
 * en déclenche cinq — quatre lectures de la note (sticker du ProductHero, sticker du pied de page,
 * JSON-LD {@code AggregateRating}, bloc {@code sofnt:avisClient}) et une lecture des avis. Ils
 * convergent ici, sur un magasin ehcache obtenu auprès de la plateforme : « Vider tous les
 * caches » l'atteint donc nativement et le propage au cluster.
 *
 * <p>Trois traits délibérés :
 *
 * <ul>
 *   <li><b>L'échec est mémorisé</b>, sur une fenêtre bien plus courte qu'un succès. Sans cela une
 *       API en panne fait repartir un appel à chaque rendu, exactement quand il ne faut pas. C'est
 *       pourquoi le test de service porte sur l'ENTRÉE ({@link TtlCache.Hit}) et jamais sur
 *       {@code valeur != null} : ce dernier perdrait tout le cache d'échec.</li>
 *   <li><b>Un seul appel en vol par clé</b>, via {@link KeyedLocks}. Une fenêtre de fraîcheur seule
 *       ne rattrape pas la rafale de reprise après purge : toutes les pages manquent le cache avant
 *       que la première réponse ne l'alimente.</li>
 *   <li><b>Le {@link JCRNodeWrapper} ne quitte jamais le thread appelant.</b> Une session JCR est
 *       liée à la requête ; la confier à un rafraîchissement de fond la trouverait fermée, et
 *       l'échec — attrapé, transformé en {@code null} — serait silencieux et définitif. Le verrou
 *       évite d'avoir à poser ce piège.</li>
 * </ul>
 *
 * <h2>Timeouts — ce qui rend le verrou sûr</h2>
 *
 * <p>Le {@code ReviewService} amont construit son client HTTP sans aucune borne d'attente : en
 * HttpClient 5, {@code responseTimeout} vaut {@code null} par défaut. Un amont qui accepte la
 * connexion puis ne répond jamais — proxy d'entreprise qui avale les connexions, backend saturé qui
 * garde la socket ouverte — bloque donc le thread appelant sans limite. <b>Et un blocage n'est pas
 * une exception :</b> les {@code try/catch} ci-dessous ne rattrapent rien, le thread attend.
 *
 * <p>Le verrou aggraverait ce tableau, puisque l'appel amont est fait en tenant le moniteur : le
 * gagnant attend sur la socket, les autres sur un {@code synchronized} qui n'est pas interruptible,
 * et une clé figée gèle aussi les autres clés tombées sur sa bande. Le cache borne le nombre
 * d'appels HTTP <i>sortants</i>, pas le nombre de threads <i>bloqués</i>.
 *
 * <p>D'où le client construit ici, à l'activation, par {@link HttpClientFactory} et passé aux
 * surcharges publiques {@code (…, HttpClient)} du {@link ReviewService} — le point d'entrée prévu
 * par l'amont, qui évite toute release de {@code portal-common-sofinco}. Une panne devient alors une
 * note manquante : {@code getAverageRate} renvoie {@code null}, la fenêtre d'échec le mémorise, et
 * le balisage JSON-LD est simplement omis. <b>Le verrou et les timeouts sont une seule décision.</b>
 *
 * <h2>Testabilité</h2>
 *
 * <p>Les constructeurs seam {@link #ReviewServiceBridgeImpl(Supplier)} et
 * {@link #ReviewServiceBridgeImpl(Supplier, Clock, CacheManager)} acceptent un fournisseur de
 * {@link ReviewService}, une horloge et un {@code CacheManager} injectables, sans toucher au
 * singleton statique.
 *
 * <h2>OSGi binding</h2>
 *
 * <p>{@code @Component(service = ReviewServiceBridge.class)} enregistre cette impl sous le FQN
 * {@code ch.sofinco.core.bridge.ReviewServiceBridge} — exactement la chaîne attendue par
 * {@code my-template-set/src/lib/javaBridge.ts}.
 */
@Component(
        service = ReviewServiceBridge.class,
        immediate = true,
        configurationPid = "ch.sofinco.core.reviews"
)
@Designate(ocd = ReviewCacheConfig.class)
public class ReviewServiceBridgeImpl implements ReviewServiceBridge {

    private static final Logger LOG = LoggerFactory.getLogger(ReviewServiceBridgeImpl.class);

    static final String CACHE_NAME = "sofincoVerifiedReviews";

    /**
     * Deux espaces de clés dans un seul magasin : la note et les avis n'ont ni la même valeur ni
     * la même granularité, mais un cache ehcache par type serait une configuration de plus à régler
     * pour rien.
     */
    private static final String AVERAGE_PREFIX = "avg|";
    private static final String REVIEWS_PREFIX = "rev|";

    /**
     * Assez de bandes pour que deux sites ne se sérialisent qu'exceptionnellement, assez peu pour
     * rester un tableau trivial. Cf. {@link KeyedLocks} sur le choix strié.
     */
    private static final int LOCK_STRIPES = 16;

    private static final Duration DEFAULT_AVERAGE_TTL = Duration.ofSeconds(600);
    private static final Duration DEFAULT_REVIEWS_TTL = Duration.ofSeconds(600);
    private static final Duration DEFAULT_FAILURE_TTL = Duration.ofSeconds(60);
    private static final int DEFAULT_MAX_ENTRIES = 256;

    /*
     * Replis des timeouts, alignés sur les défauts de ReviewCacheConfig. Contrairement aux fenêtres
     * ci-dessus, `0` n'est PAS un réglage valide ici — un appel sans borne est ce qu'on supprime —
     * donc toute valeur <= 0 retombe sur ces valeurs (cf. `positive`).
     */
    private static final int DEFAULT_CONNECT_TIMEOUT_SECONDS = 3;
    private static final int DEFAULT_SOCKET_TIMEOUT_SECONDS = 5;
    private static final int DEFAULT_RESPONSE_TIMEOUT_SECONDS = 5;

    /**
     * Le message d'une panne amont peut être une page HTML entière — le corps de la réponse du
     * proxy corporate, par exemple. Tronqué et aplati par {@link LogSanitizer} : la cause reste
     * lisible, le journal reste un journal.
     */
    private static final int MAX_LOGGED_CAUSE = 300;

    private final Supplier<ReviewService> reviewServiceSupplier;
    private final Clock clock;
    private final EhcacheStoreFactory stores;
    private final KeyedLocks locks = new KeyedLocks(LOCK_STRIPES);

    /** Remplacé en bloc à la (re)configuration — jamais muté champ par champ. */
    private final AtomicReference<Caches> caches = new AtomicReference<>();

    /**
     * Client HTTP borné, construit UNE fois par configuration et partagé — pool, TLS et DNS
     * mutualisés. L'amont, lui, en construisait un complet à chaque appel et ne le fermait jamais :
     * chaque lecture de note abandonnait un {@code PoolingHttpClientConnectionManager} derrière elle.
     *
     * <p>{@code null} tant que {@link #activate} n'a pas tourné, ou si sa construction a échoué : les
     * appelants retombent alors sur la surcharge d'origine, exactement comme avant ce correctif.
     */
    private final AtomicReference<CloseableHttpClient> httpClient = new AtomicReference<>();

    /** Sérialise construction et fermeture : {@code @Modified} peut croiser un rendu en cours. */
    private final Object httpClientLock = new Object();

    /**
     * Accès au {@code CacheManager} ehcache de Jahia.
     *
     * <p><b>C'est {@code CacheProvider} et non {@code CacheService}.</b> Le pont
     * {@code JahiaCoreSpringBridge} n'expose au registre OSGi que le bean {@code ehCacheProvider},
     * sous cette interface.
     *
     * <p><b>OPTIONNELLE, délibérément.</b> Le cache est une optimisation : il ne doit en aucun cas
     * conditionner l'activation du pont, sans quoi les blocs d'avis disparaîtraient du site le jour
     * où le fournisseur n'est pas là. Voir {@link EhcacheStoreFactory}, qui dégrade vers un
     * gestionnaire privé.
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
     * Constructeur OSGi : singleton statique {@link ReviewService#getInstance()}, et AUCUN
     * {@code CacheManager} injecté.
     *
     * <p>Le {@code null} est le point important : {@link EhcacheStoreFactory} ne consulte le
     * {@link #cacheProvider} que si aucun gestionnaire ne lui a été imposé. En passer un ici —
     * fût-ce le gestionnaire privé de repli — rendrait la référence OSGi inopérante et le cache
     * échapperait au {@code CacheManager} de Jahia, donc à la propagation cluster.
     *
     * <p>Pas d'{@code applyDefaults()} non plus : le magasin est construit par {@link #activate},
     * une fois que Declarative Services a injecté {@link #cacheProvider}. Le construire ici le
     * créerait dans le gestionnaire privé, et {@code activate} en créerait un second du même nom
     * ailleurs — le premier resterait orphelin à chaque redéploiement.
     */
    public ReviewServiceBridgeImpl() {
        this.reviewServiceSupplier = ReviewService::getInstance;
        this.clock = Clock.systemUTC();
        this.stores = new EhcacheStoreFactory(CACHE_NAME, null);
    }

    /** Seam de test : injection d'un fournisseur (mock {@link ReviewService}). Package-private. */
    ReviewServiceBridgeImpl(Supplier<ReviewService> reviewServiceSupplier) {
        this(reviewServiceSupplier, Clock.systemUTC(), EhcacheStoreFactory.standaloneManager());
    }

    /**
     * Seam de test le plus large : horloge fixe pour piloter l'expiration, {@code CacheManager}
     * fourni par le test. Contrairement au constructeur OSGi, celui-ci construit le magasin tout de
     * suite : les tests qui passent par lui n'appellent pas {@link #activate}.
     */
    ReviewServiceBridgeImpl(Supplier<ReviewService> reviewServiceSupplier, Clock clock,
                            CacheManager cacheManager) {
        this.reviewServiceSupplier = reviewServiceSupplier;
        this.clock = clock;
        this.stores = new EhcacheStoreFactory(CACHE_NAME,
                cacheManager != null ? cacheManager : EhcacheStoreFactory.standaloneManager());
        applyDefaults();
    }

    // Visibilité paquet, pas `public` : `ch.sofinco.core.bridge` est un paquet EXPORTÉ, tandis que
    // `ReviewCacheConfig` vit dans le paquet privé `ch.sofinco.core.config`. Une signature publique
    // ferait fuiter ce type hors du bundle — bnd le signale (« Export ... has private references »)
    // et un bundle important ce paquet hériterait d'une signature qu'il ne peut pas résoudre.
    // Declarative Services 1.3+ accepte les méthodes de cycle de vie quelle que soit leur visibilité
    // (OSGi Compendium 112.3.2).
    @Activate
    void activate(ReviewCacheConfig config) {
        apply(config);
        Caches c = caches.get();
        LOG.info("Cache ReviewServiceBridge activé — note {} s, avis {} s, échec {} s ; "
                        + "timeouts connexion {} s, socket {} s, réponse {} s",
                c.averageTtl().getSeconds(), c.reviewsTtl().getSeconds(), c.failureTtl().getSeconds(),
                positive(config.connectTimeoutSeconds(), DEFAULT_CONNECT_TIMEOUT_SECONDS),
                positive(config.socketTimeoutSeconds(), DEFAULT_SOCKET_TIMEOUT_SECONDS),
                positive(config.responseTimeoutSeconds(), DEFAULT_RESPONSE_TIMEOUT_SECONDS));
    }

    /**
     * Reconfiguration à chaud. Le magasin est reconstruit et vidé : la nouvelle politique s'applique
     * immédiatement, et c'est aussi le levier manuel dont dispose l'exploitation.
     */
    @Modified
    void modified(ReviewCacheConfig config) {
        apply(config);
        LOG.info("ReviewServiceBridge reconfiguré — cache vidé, note {} s",
                caches.get().averageTtl().getSeconds());
    }

    /**
     * Vide le cache à l'arrêt du bundle — voir {@link EhcacheStoreFactory#dispose()} — et ferme le
     * client HTTP. Cette fermeture n'est pas cosmétique : sans elle, chaque redéploiement laisse un
     * pool de connexions vivant derrière un classloader mort.
     */
    @Deactivate
    void deactivate() {
        stores.dispose();
        synchronized (httpClientLock) {
            closeHttpClient();
        }
    }

    private void apply(ReviewCacheConfig config) {
        // Valeurs hors bornes : on retombe sur les défauts. Une fenêtre négative n'a pas de sens ;
        // zéro, en revanche, est un réglage valide qui désactive la mémorisation.
        rebuild(
                seconds(config.averageTtlSeconds(), DEFAULT_AVERAGE_TTL),
                seconds(config.reviewsTtlSeconds(), DEFAULT_REVIEWS_TTL),
                seconds(config.failureTtlSeconds(), DEFAULT_FAILURE_TTL),
                config.maxEntries() > 0 ? config.maxEntries() : DEFAULT_MAX_ENTRIES);
        rebuildHttpClient(config);
    }

    /**
     * (Re)construit le client borné. Appelé depuis {@link #apply}, donc à l'activation ET à chaque
     * enregistrement de la configuration : les timeouts se règlent à chaud comme les fenêtres.
     *
     * <p>L'ancien client est fermé gracieusement d'abord. Une requête en vol au moment d'un
     * {@code @Modified} peut en échouer — elle est rattrapée par les {@code catch} des méthodes
     * amont et mémorisée sur la fenêtre d'échec, ce qui est un prix acceptable pour un événement
     * aussi rare qu'une reconfiguration.
     */
    private void rebuildHttpClient(ReviewCacheConfig config) {
        synchronized (httpClientLock) {
            closeHttpClient();
            try {
                httpClient.set(HttpClientFactory.build(
                        positive(config.connectTimeoutSeconds(), DEFAULT_CONNECT_TIMEOUT_SECONDS),
                        positive(config.socketTimeoutSeconds(), DEFAULT_SOCKET_TIMEOUT_SECONDS),
                        positive(config.responseTimeoutSeconds(), DEFAULT_RESPONSE_TIMEOUT_SECONDS)));
            } catch (RuntimeException e) {
                // Jamais d'échec d'activation pour un problème de client HTTP : les blocs d'avis ne
                // doivent pas disparaître du site pour ça. Mais en WARN, car ce repli est exactement
                // le mode NON BORNÉ que ce correctif supprime.
                LOG.warn("Client HTTP borné indisponible ({}) — repli sur le client par défaut du "
                        + "ReviewService, SANS timeout. Les appels d'avis peuvent bloquer un thread "
                        + "de rendu.", e.toString());
            }
        }
    }

    /** À appeler en tenant {@link #httpClientLock}. */
    private void closeHttpClient() {
        CloseableHttpClient old = httpClient.getAndSet(null);
        if (old != null) {
            try {
                // GRACEFUL par défaut : laisse les requêtes actives se terminer.
                old.close();
            } catch (IOException e) {
                LOG.debug("Échec fermeture du client HTTP d'avis (ignoré) : {}", e.getMessage());
            }
        }
    }

    /** Défauts appliqués par les seams de test, qui n'appellent pas {@link #activate}. */
    private void applyDefaults() {
        rebuild(DEFAULT_AVERAGE_TTL, DEFAULT_REVIEWS_TTL, DEFAULT_FAILURE_TTL, DEFAULT_MAX_ENTRIES);
    }

    private void rebuild(Duration averageTtl, Duration reviewsTtl, Duration failureTtl, int maxEntries) {
        // Le TTL ehcache n'est qu'un filet mémoire : l'ancienneté servable est mesurée à la lecture
        // par TtlCache. On le pose sur la plus longue des fenêtres pour ne rien évincer trop tôt.
        Duration storeTtl = averageTtl.compareTo(reviewsTtl) >= 0 ? averageTtl : reviewsTtl;
        Ehcache store = stores.store(cacheProvider, maxEntries, max(storeTtl, failureTtl));
        caches.set(new Caches(
                new TtlCache<>(store, AVERAGE_PREFIX, clock),
                new TtlCache<>(store, REVIEWS_PREFIX, clock),
                averageTtl, reviewsTtl, failureTtl));
    }

    private static Duration max(Duration a, Duration b) {
        return a.compareTo(b) >= 0 ? a : b;
    }

    private static Duration seconds(int configured, Duration fallback) {
        return configured >= 0 ? Duration.ofSeconds(configured) : fallback;
    }

    /**
     * Sémantique volontairement différente de {@link #seconds} : pour un timeout, {@code 0} est
     * l'attente sans borne — précisément ce que ce composant supprime. {@link HttpClientFactory}
     * refuserait d'ailleurs la valeur ; on clampe avant de l'appeler.
     */
    private static int positive(int configured, int fallback) {
        return configured > 0 ? configured : fallback;
    }

    @Override
    public List<Map<String, Object>> fetchReviews(int nbReview, String product, int minNote,
                                                  JCRNodeWrapper config) {
        Caches c = caches.get();
        String key = reviewsKey(config, nbReview, product, minNote);
        if (key == null) {
            // Chemin illisible : plutôt que de risquer une collision entre sites, on court-circuite.
            return fetchReviewsUpstream(nbReview, product, minNote, config, null, c);
        }

        var hit = c.reviews().hit(key);
        if (hit != null) {
            return hit.value();
        }

        // Verrou préfixé comme celui de `getAverageRate` : les deux espaces de clés ne partagent
        // jamais une bande par accident, même si les deux formes de clé se rejoignaient un jour.
        synchronized (locks.forKey(REVIEWS_PREFIX + key)) {
            // Double lecture : le gagnant de la rafale vient peut-être de remplir l'entrée.
            hit = c.reviews().hit(key);
            if (hit != null) {
                return hit.value();
            }
            return fetchReviewsUpstream(nbReview, product, minNote, config, key, c);
        }
    }

    /**
     * Appel amont + mémorisation.
     *
     * <p><b>Le point à ne pas rater :</b> cette méthode renvoie une liste vide aussi bien sur échec
     * que sur « aucun avis » légitime. La distinction se fait ICI, au point d'écriture — et surtout
     * pas à la relecture, où un test sur {@code isEmpty()} confondrait les deux.
     *
     * <p><b>Une liste vide compte comme un échec.</b> Le legacy attrape lui-même l'{@code IOException}
     * d'un timeout et renvoie une liste vide : depuis ici, une panne amont est indistinguable d'un
     * site sans avis. La mémoriser sur la fenêtre longue laisserait le bloc vide pendant tout le TTL
     * après le rétablissement de l'API. C'est l'asymétrie avec {@code getAverageRate}, qui renvoie
     * {@code null} et tombe naturellement sur la fenêtre d'échec. Le coût de ce choix est nul :
     * quelques blocs {@code sofnt:avisClient} rappellent l'amont une fois par fenêtre d'échec.
     */
    private List<Map<String, Object>> fetchReviewsUpstream(int nbReview, String product, int minNote,
                                                           JCRNodeWrapper config, String key,
                                                           Caches c) {
        try {
            List<JsonNode> raw = callFetchReviews(nbReview, product, minNote, config);
            List<Map<String, Object>> out = new ArrayList<>(raw == null ? 0 : raw.size());
            if (raw != null) {
                for (JsonNode node : raw) {
                    // `convertToLinkedMap` renvoie null sur un NullNode Jackson, et `List.copyOf`
                    // refuse les éléments nuls : sans ce filtre, un seul avis nul dans la charge
                    // amont lèverait une NPE, attrapée plus bas et mémorisée comme une panne.
                    Map<String, Object> converted = JsonFacade.convertToLinkedMap(node);
                    if (converted != null) {
                        out.add(converted);
                    }
                }
            }
            // Vue immuable : l'entrée est partagée entre threads, et le côté JS ne fait que lire.
            List<Map<String, Object>> served = List.copyOf(out);
            store(c.reviews(), key, served, served.isEmpty() ? c.failureTtl() : c.reviewsTtl());
            return served;
        } catch (NumberFormatException e) {
            LOG.warn("ReviewService.fetchReviews returned non-numeric data " +
                    "(upstream API likely returned HTML, e.g. proxy login page). " +
                    "Returning empty list. Root: {}", LogSanitizer.safeLog(e.getMessage(), MAX_LOGGED_CAUSE));
            return storeFailure(c.reviews(), key, Collections.emptyList(), c.failureTtl());
        } catch (Exception e) {
            LOG.warn("ReviewService.fetchReviews failed (product={}, nbReview={}). " +
                    "Returning empty list. Root: {}: {}",
                    product, nbReview, e.getClass().getSimpleName(),
                    LogSanitizer.safeLog(e.getMessage(), MAX_LOGGED_CAUSE));
            return storeFailure(c.reviews(), key, Collections.emptyList(), c.failureTtl());
        }
    }

    @Override
    public Map<String, Object> getAverageRate(JCRNodeWrapper config) {
        Caches c = caches.get();
        String key = nodePath(config);
        if (key == null) {
            return getAverageRateUpstream(config, null, c);
        }

        var hit = c.average().hit(key);
        if (hit != null) {
            return hit.value();
        }

        synchronized (locks.forKey(AVERAGE_PREFIX + key)) {
            hit = c.average().hit(key);
            if (hit != null) {
                return hit.value();
            }
            return getAverageRateUpstream(config, key, c);
        }
    }

    /**
     * Appel amont + mémorisation. Un {@code null} — amont muet ou en erreur — est mémorisé sur la
     * fenêtre courte : cela cesse de marteler une API morte sans retarder la reprise.
     */
    private Map<String, Object> getAverageRateUpstream(JCRNodeWrapper config, String key, Caches c) {
        try {
            AverageRate average = callGetAverageRate(config);
            if (average == null) {
                return storeFailure(c.average(), key, null, c.failureTtl());
            }
            Map<String, Object> out = new HashMap<>();
            out.put("average", average.getRate());
            out.put("nbReview", average.getNbReview());
            Map<String, Object> served = Map.copyOf(out);
            store(c.average(), key, served, c.averageTtl());
            return served;
        } catch (NumberFormatException e) {
            LOG.warn("ReviewService.getAverageRate returned non-numeric data " +
                    "(upstream API likely returned HTML, e.g. proxy login page). " +
                    "Returning null. Root: {}", LogSanitizer.safeLog(e.getMessage(), MAX_LOGGED_CAUSE));
            return storeFailure(c.average(), key, null, c.failureTtl());
        } catch (Exception e) {
            LOG.warn("ReviewService.getAverageRate failed. Returning null. Root: {}: {}",
                    e.getClass().getSimpleName(), LogSanitizer.safeLog(e.getMessage(), MAX_LOGGED_CAUSE));
            return storeFailure(c.average(), key, null, c.failureTtl());
        }
    }

    /*
     * Choix de surcharge. Tant que le client borné n'existe pas — avant `activate`, ou après un échec
     * de construction — on emprunte la surcharge d'origine : le comportement est alors exactement
     * celui d'avant ce correctif, appel non borné compris.
     *
     * Les surcharges `(…, HttpClient)` prennent un `org.apache.hc.client5.http.classic.HttpClient`
     * depuis portal-common-sofinco 26.5.2 ; le pom épingle l'Import-Package à [26.5.2,27) pour qu'une
     * version antérieure fasse échouer la RÉSOLUTION du bundle plutôt que de lever un
     * NoSuchMethodError en plein rendu.
     */

    private AverageRate callGetAverageRate(JCRNodeWrapper config) {
        ReviewService service = reviewServiceSupplier.get();
        CloseableHttpClient client = httpClient.get();
        return client == null ? service.getAverageRate(config) : service.getAverageRate(config, client);
    }

    private List<JsonNode> callFetchReviews(int nbReview, String product, int minNote,
                                            JCRNodeWrapper config) {
        ReviewService service = reviewServiceSupplier.get();
        CloseableHttpClient client = httpClient.get();
        return client == null
                ? service.fetchReviews(nbReview, product, minNote, config)
                : service.fetchReviews(nbReview, product, minNote, config, client);
    }

    private static <V> void store(TtlCache<V> cache, String key, V value, Duration ttl) {
        if (key != null) {
            cache.put(key, value, ttl);
        }
    }

    /** Mémorise l'échec puis renvoie le repli — écrit pour tenir sur la ligne de retour. */
    private static <V> V storeFailure(TtlCache<V> cache, String key, V fallback, Duration ttl) {
        store(cache, key, fallback, ttl);
        return fallback;
    }

    /**
     * Clé des avis : tout ce qui détermine le résultat.
     *
     * <p>La cardinalité reste faible — {@code product} et {@code minNote} viennent de propriétés JCR
     * posées par un contributeur sur un bloc {@code sofnt:avisClient}, jamais d'un paramètre de
     * requête. Le nombre de clés est donc borné par le nombre de blocs du site.
     */
    private static String reviewsKey(JCRNodeWrapper config, int nbReview, String product, int minNote) {
        String path = nodePath(config);
        return path == null ? null : path + '|' + nbReview + '|' + product + '|' + minNote;
    }

    /**
     * Chemin du nœud de configuration, ou {@code null} s'il est illisible — auquel cas l'appelant
     * court-circuite le cache plutôt que de risquer une collision de clé entre sites.
     */
    private static String nodePath(JCRNodeWrapper config) {
        if (config == null) {
            return null;
        }
        try {
            return config.getPath();
        } catch (RuntimeException e) {
            LOG.debug("Chemin du nœud de configuration illisible — cache court-circuité", e);
            return null;
        }
    }

    /** Politique de cache en vigueur. Remplacée en bloc à chaque (re)configuration. */
    private record Caches(TtlCache<Map<String, Object>> average,
                          TtlCache<List<Map<String, Object>>> reviews,
                          Duration averageTtl,
                          Duration reviewsTtl,
                          Duration failureTtl) {
    }
}
