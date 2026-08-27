package ch.sofinco.core.bridge;

import ch.sofinco.core.cache.EhcacheStoreFactory;
import ch.sofinco.core.config.ReviewCacheConfig;
import fr.sofinco.portal.jahia.model.AverageRate;
import fr.sofinco.portal.jahia.services.ReviewService;
import net.sf.ehcache.CacheManager;
import net.sf.ehcache.config.CacheConfiguration;
import net.sf.ehcache.config.Configuration;
import org.jahia.services.cache.CacheProvider;
import org.jahia.services.content.JCRNodeWrapper;
import org.junit.jupiter.api.Test;

import java.lang.annotation.Annotation;
import java.lang.reflect.Field;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cycle de vie OSGi et configuration de {@link ReviewServiceBridgeImpl}.
 *
 * <p>Distinct de {@code ReviewServiceBridgeImplCacheTest}, qui passe systématiquement par le seam
 * à {@code CacheManager} injecté — donc jamais par le chemin de PRODUCTION. Ce fichier prend
 * l'autre : constructeur OSGi nu, {@link CacheProvider} injecté par le conteneur, magasin construit
 * par {@code activate}. C'est là qu'une régression est invisible en recette, le cache continuant de
 * fonctionner dans un gestionnaire privé.
 */
class ReviewServiceBridgeImplLifecycleTest {

    private static final String CACHE_NAME = "sofincoVerifiedReviews";

    /**
     * Le test qui garde le câblage de production.
     *
     * <p>Si le constructeur OSGi impose un {@code CacheManager} — même celui de repli — la référence
     * {@code CacheProvider} n'est jamais consultée : le cache échappe alors au gestionnaire de
     * Jahia, donc à la propagation de « Vider tous les caches » sur le cluster.
     */
    @Test
    void activate_buildsTheStoreInTheCacheManagerHandedOverByTheProvider() throws Exception {
        CacheManager platform = isolatedManager("lifecycle-platform");
        CacheProvider provider = mock(CacheProvider.class);
        when(provider.getCacheManager()).thenReturn(platform);

        var bridge = new ReviewServiceBridgeImpl();
        injectProvider(bridge, provider);

        // Rien avant l'activation : le magasin ne doit pas être construit au constructeur, sans quoi
        // il naîtrait dans le gestionnaire privé et `activate` en créerait un SECOND du même nom.
        assertThat(platform.getEhcache(CACHE_NAME)).isNull();

        bridge.activate(config(600, 600, 60, 256));

        verify(provider, atLeastOnce()).getCacheManager();
        assertThat(platform.getEhcache(CACHE_NAME)).isNotNull();
    }

    /** L'absence de fournisseur dégrade, elle n'empêche jamais l'activation. */
    @Test
    void activate_fallsBackToThePrivateManagerWhenNoProviderIsBound() {
        var bridge = new ReviewServiceBridgeImpl();

        bridge.activate(config(600, 600, 60, 256));

        assertThat(EhcacheStoreFactory.standaloneManager().getEhcache(CACHE_NAME)).isNotNull();
    }

    /** Le plafond configuré atteint réellement la configuration ehcache. */
    @Test
    void activate_appliesMaxEntriesToTheStore() throws Exception {
        CacheManager platform = isolatedManager("lifecycle-maxentries");
        var bridge = new ReviewServiceBridgeImpl();
        injectProvider(bridge, providerOf(platform));

        bridge.activate(config(600, 600, 60, 42));

        assertThat(platform.getEhcache(CACHE_NAME).getCacheConfiguration().getMaxEntriesLocalHeap())
                .isEqualTo(42);
    }

    /** Enregistrer la configuration est le levier de purge manuel de l'exploitation. */
    @Test
    void modified_purgesTheStoreAndAppliesTheNewWindow() {
        ReviewService upstream = upstreamWithRate();
        var bridge = seam(upstream, "lifecycle-modified");

        bridge.getAverageRate(config("/sites/a/config"));
        bridge.getAverageRate(config("/sites/a/config"));
        verify(upstream, times(1)).getAverageRate(any());

        bridge.modified(config(600, 600, 60, 256));

        // Même fenêtre, mais le magasin a été vidé : l'amont est rappelé. Il l'est désormais par la
        // surcharge bornée — `modified` a construit le client en même temps qu'il a vidé le cache.
        bridge.getAverageRate(config("/sites/a/config"));
        verify(upstream, times(1)).getAverageRate(any(), any());
    }

    /**
     * Sans ce retrait, un redéploiement laisse un cache orphelin — inutile, compté dans les
     * statistiques, et portant des objets chargés par un classloader mort.
     */
    @Test
    void deactivate_removesTheCacheFromItsManager() throws Exception {
        CacheManager platform = isolatedManager("lifecycle-deactivate");
        var bridge = new ReviewServiceBridgeImpl();
        injectProvider(bridge, providerOf(platform));

        bridge.activate(config(600, 600, 60, 256));
        assertThat(platform.getEhcache(CACHE_NAME)).isNotNull();

        bridge.deactivate();

        assertThat(platform.getEhcache(CACHE_NAME)).isNull();
    }

    /**
     * Réglage documenté dans {@code ch.sofinco.core.reviews.cfg} : zéro désactive la mémorisation,
     * et n'est donc PAS traité comme une valeur hors bornes.
     */
    @Test
    void zeroTtlDisablesMemoizationInsteadOfFallingBackToTheDefault() {
        ReviewService upstream = upstreamWithRate();
        var bridge = seam(upstream, "lifecycle-zero-ttl");
        bridge.modified(config(0, 0, 0, 256));

        bridge.getAverageRate(config("/sites/a/config"));
        bridge.getAverageRate(config("/sites/a/config"));

        verify(upstream, times(2)).getAverageRate(any(), any());
    }

    /** Une fenêtre négative n'a pas de sens : on retombe sur le défaut plutôt que sur zéro. */
    @Test
    void negativeTtlFallsBackToTheDefaultWindow() {
        ReviewService upstream = upstreamWithRate();
        var bridge = seam(upstream, "lifecycle-negative-ttl");
        bridge.modified(config(-1, -1, -1, -1));

        bridge.getAverageRate(config("/sites/a/config"));
        bridge.getAverageRate(config("/sites/a/config"));

        verify(upstream, times(1)).getAverageRate(any(), any());
    }

    // ------------------------------------------------- client HTTP borné

    /**
     * Le test qui porte le correctif : sans client borné, l'appel amont part sans aucun timeout et
     * le verrou tenu autour de lui transforme une panne de l'API en threads de rendu figés.
     */
    @Test
    void activate_buildsABoundedClientAndPassesItUpstream() throws Exception {
        ReviewService upstream = upstreamWithRate();
        var bridge = seam(upstream, "lifecycle-bounded-client");

        // Avant configuration : pas de client, donc surcharge d'origine — le comportement d'avant.
        bridge.getAverageRate(config("/sites/a/config"));
        verify(upstream, times(1)).getAverageRate(any());
        assertThat(boundedClient(bridge)).isNull();

        bridge.activate(config(600, 600, 60, 256));

        assertThat(boundedClient(bridge)).isNotNull();
        bridge.getAverageRate(config("/sites/a/config"));
        verify(upstream, times(1)).getAverageRate(any(), any());
    }

    /**
     * Un timeout à zéro serait l'attente sans borne — exactement ce que ce composant supprime. La
     * sémantique est donc l'INVERSE de celle des fenêtres, où zéro est un réglage valide.
     */
    @Test
    void nonPositiveTimeoutsFallBackToTheDefaultsInsteadOfFailingActivation() throws Exception {
        var bridge = new ReviewServiceBridgeImpl();

        bridge.activate(config(600, 600, 60, 256, 0, -1, 0));

        assertThat(boundedClient(bridge)).isNotNull();
    }

    /**
     * Sans cette fermeture, chaque redéploiement laisse un pool de connexions vivant derrière un
     * classloader mort — la fuite même que le client partagé est censé supprimer.
     */
    @Test
    void deactivate_closesTheBoundedClient() throws Exception {
        var bridge = new ReviewServiceBridgeImpl();
        bridge.activate(config(600, 600, 60, 256));
        assertThat(boundedClient(bridge)).isNotNull();

        bridge.deactivate();

        assertThat(boundedClient(bridge)).isNull();
    }

    /** Une reconfiguration remplace le client : les nouveaux timeouts s'appliquent à chaud. */
    @Test
    void modified_replacesTheBoundedClient() throws Exception {
        var bridge = new ReviewServiceBridgeImpl();
        bridge.activate(config(600, 600, 60, 256));
        Object first = boundedClient(bridge);

        bridge.modified(config(600, 600, 60, 256, 1, 2, 2));

        assertThat(boundedClient(bridge)).isNotNull().isNotSameAs(first);
    }

    // ------------------------------------------------------------------ helpers

    /** Le champ n'a pas d'accesseur : l'exposer pour un test ouvrirait une porte dans la prod. */
    private static Object boundedClient(ReviewServiceBridgeImpl bridge) throws Exception {
        Field field = ReviewServiceBridgeImpl.class.getDeclaredField("httpClient");
        field.setAccessible(true);
        return ((AtomicReference<?>) field.get(bridge)).get();
    }

    /**
     * Declarative Services écrit lui-même dans le champ de référence ; hors conteneur, la réflexion
     * est le seul moyen de reproduire cette injection sans ouvrir une porte dans le code de prod.
     */
    private static void injectProvider(ReviewServiceBridgeImpl bridge, CacheProvider provider)
            throws Exception {
        Field field = ReviewServiceBridgeImpl.class.getDeclaredField("cacheProvider");
        field.setAccessible(true);
        field.set(bridge, provider);
    }

    private static CacheProvider providerOf(CacheManager manager) {
        CacheProvider provider = mock(CacheProvider.class);
        when(provider.getCacheManager()).thenReturn(manager);
        return provider;
    }

    private static ReviewServiceBridgeImpl seam(ReviewService upstream, String managerName) {
        return new ReviewServiceBridgeImpl(() -> upstream, fixedClock(), isolatedManager(managerName));
    }

    private static Clock fixedClock() {
        return Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC);
    }

    /**
     * Les DEUX surcharges sont stubbées : le pont emprunte celle à {@code HttpClient} dès qu'une
     * configuration a été appliquée, et celle d'origine tant qu'aucune ne l'a été. Les {@code verify}
     * de chaque test disent laquelle est attendue à ce moment-là.
     */
    private static ReviewService upstreamWithRate() {
        ReviewService upstream = mock(ReviewService.class);
        AverageRate average = mock(AverageRate.class);
        when(average.getRate()).thenReturn(4.7);
        when(average.getNbReview()).thenReturn(1234);
        when(upstream.getAverageRate(any())).thenReturn(average);
        when(upstream.getAverageRate(any(), any())).thenReturn(average);
        return upstream;
    }

    private static JCRNodeWrapper config(String path) {
        JCRNodeWrapper node = mock(JCRNodeWrapper.class);
        when(node.getPath()).thenReturn(path);
        return node;
    }

    /** Un gestionnaire par test : les cas restent indépendants les uns des autres. */
    private static CacheManager isolatedManager(String name) {
        CacheManager existing = CacheManager.getCacheManager(name);
        return existing != null ? existing : CacheManager.newInstance(new Configuration()
                .name(name)
                .defaultCache(new CacheConfiguration("default", 100)));
    }

    /** Fenêtres à la carte, timeouts aux valeurs nominales — le cas de la plupart des tests. */
    private static ReviewCacheConfig config(int average, int reviews, int failure, int maxEntries) {
        return config(average, reviews, failure, maxEntries, 3, 5, 5);
    }

    /**
     * Une annotation de configuration ne s'instancie pas : on l'implémente. Plus lisible qu'un mock
     * à sept stubs, et le compilateur signale l'ajout d'un attribut au {@code @interface}.
     */
    private static ReviewCacheConfig config(int average, int reviews, int failure, int maxEntries,
                                            int connectTimeout, int socketTimeout,
                                            int responseTimeout) {
        return new ReviewCacheConfig() {
            @Override
            public Class<? extends Annotation> annotationType() {
                return ReviewCacheConfig.class;
            }

            @Override
            public int averageTtlSeconds() {
                return average;
            }

            @Override
            public int reviewsTtlSeconds() {
                return reviews;
            }

            @Override
            public int failureTtlSeconds() {
                return failure;
            }

            @Override
            public int maxEntries() {
                return maxEntries;
            }

            @Override
            public int connectTimeoutSeconds() {
                return connectTimeout;
            }

            @Override
            public int socketTimeoutSeconds() {
                return socketTimeout;
            }

            @Override
            public int responseTimeoutSeconds() {
                return responseTimeout;
            }
        };
    }
}
