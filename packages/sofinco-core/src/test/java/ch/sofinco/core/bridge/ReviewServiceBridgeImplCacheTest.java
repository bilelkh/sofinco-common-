package ch.sofinco.core.bridge;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fr.sofinco.portal.jahia.model.AverageRate;
import fr.sofinco.portal.jahia.services.ReviewService;
import net.sf.ehcache.CacheManager;
import net.sf.ehcache.config.CacheConfiguration;
import net.sf.ehcache.config.Configuration;
import org.jahia.services.content.JCRNodeWrapper;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Vérifie la couche de cache de {@link ReviewServiceBridgeImpl}.
 *
 * <p>Les tests de contrat du pont — conversion Jackson, replis sur exception — vivent dans
 * {@code ReviewServiceBridgeImplTest} et n'ont pas eu à bouger : chacun y construit un pont neuf,
 * dont le nœud de configuration mocké n'expose aucun chemin, ce qui court-circuite le cache.
 *
 * <p>Ici au contraire chaque cas stube {@code getPath()} — c'est ce qui active la mémorisation.
 */
class ReviewServiceBridgeImplCacheTest {

    private static final Duration AVERAGE_TTL = Duration.ofSeconds(600);
    private static final Duration FAILURE_TTL = Duration.ofSeconds(60);

    /** Horloge pilotée : avancer le temps est la seule façon de tester une expiration. */
    private final MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));

    @Test
    void getAverageRate_callsUpstreamOnceWithinTheWindow() {
        ReviewService upstream = upstreamWithRate(4.7, 1234);
        var bridge = bridge(upstream, "cache-avg-window");

        assertThat(bridge.getAverageRate(config("/sites/a/config"))).containsEntry("average", 4.7);
        assertThat(bridge.getAverageRate(config("/sites/a/config"))).containsEntry("average", 4.7);
        assertThat(bridge.getAverageRate(config("/sites/a/config"))).containsEntry("average", 4.7);

        verify(upstream, times(1)).getAverageRate(any());
    }

    @Test
    void getAverageRate_callsUpstreamAgainOnceTheWindowHasPassed() {
        ReviewService upstream = upstreamWithRate(4.7, 1234);
        var bridge = bridge(upstream, "cache-avg-expiry");

        bridge.getAverageRate(config("/sites/a/config"));
        clock.advance(AVERAGE_TTL.plusSeconds(1));
        bridge.getAverageRate(config("/sites/a/config"));

        verify(upstream, times(2)).getAverageRate(any());
    }

    @Test
    void getAverageRate_remembersFailureOnTheShortWindow() {
        ReviewService upstream = mock(ReviewService.class);
        when(upstream.getAverageRate(any())).thenThrow(new RuntimeException("proxy login page"));
        var bridge = bridge(upstream, "cache-avg-failure");

        assertThat(bridge.getAverageRate(config("/sites/a/config"))).isNull();
        assertThat(bridge.getAverageRate(config("/sites/a/config"))).isNull();
        verify(upstream, times(1)).getAverageRate(any());

        // Toujours dans la fenêtre d'échec : on ne martèle pas un amont mort.
        clock.advance(FAILURE_TTL.minusSeconds(1));
        bridge.getAverageRate(config("/sites/a/config"));
        verify(upstream, times(1)).getAverageRate(any());

        // Fenêtre écoulée : la reprise n'est pas retardée par le TTL de succès.
        clock.advance(Duration.ofSeconds(2));
        bridge.getAverageRate(config("/sites/a/config"));
        verify(upstream, times(2)).getAverageRate(any());
    }

    @Test
    void getAverageRate_remembersAnEmptyUpstreamAnswerToo() {
        ReviewService upstream = mock(ReviewService.class);
        when(upstream.getAverageRate(any())).thenReturn(null);
        var bridge = bridge(upstream, "cache-avg-null");

        assertThat(bridge.getAverageRate(config("/sites/a/config"))).isNull();
        assertThat(bridge.getAverageRate(config("/sites/a/config"))).isNull();

        // C'est l'assertion qui protège le cache d'échec : un test de service écrit sur
        // `valeur != null` rappellerait l'amont à chaque rendu.
        verify(upstream, times(1)).getAverageRate(any());
    }

    @Test
    void getAverageRate_keepsOneEntryPerConfigurationNode() {
        ReviewService upstream = upstreamWithRate(4.7, 1234);
        var bridge = bridge(upstream, "cache-avg-multisite");

        bridge.getAverageRate(config("/sites/a/config"));
        bridge.getAverageRate(config("/sites/b/config"));

        verify(upstream, times(2)).getAverageRate(any());
    }

    @Test
    void getAverageRate_bypassesTheCacheWhenThePathIsUnreadable() {
        ReviewService upstream = upstreamWithRate(4.7, 1234);
        var bridge = bridge(upstream, "cache-avg-nopath");

        JCRNodeWrapper broken = mock(JCRNodeWrapper.class);
        when(broken.getPath()).thenThrow(new IllegalStateException("session closed"));

        bridge.getAverageRate(broken);
        bridge.getAverageRate(broken);

        // Plutôt que de risquer une collision de clé entre sites, on rappelle l'amont.
        verify(upstream, times(2)).getAverageRate(any());
    }

    /**
     * Le test qui justifie le verrou. Sans lui, les dix threads manquent tous le cache avant que la
     * première réponse ne l'alimente, et dix appels identiques partent — exactement le pic de charge
     * sur l'amont au moment d'une reprise après purge.
     *
     * <p>Même construction que {@code RepresentativeExampleServiceImplApimDedupTest}, qui teste la
     * même propriété sur l'APIM.
     */
    @SuppressWarnings("java:S2925") // l'attente simule l'aller-retour réseau : c'est elle qui crée la course
    @Test
    void getAverageRate_collapsesAConcurrentBurstIntoASingleUpstreamCall() throws Exception {
        int threads = 10;
        CountDownLatch go = new CountDownLatch(1);
        ReviewService upstream = mock(ReviewService.class);
        AverageRate rate = mock(AverageRate.class);
        when(rate.getRate()).thenReturn(4.7);
        when(rate.getNbReview()).thenReturn(1234);
        when(upstream.getAverageRate(any())).thenAnswer(invocation -> {
            Thread.sleep(120);   // élargit la fenêtre de course, comme un vrai aller-retour réseau
            return rate;
        });

        var bridge = bridge(upstream, "cache-avg-burst");
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        try {
            List<Future<Map<String, Object>>> futures = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                futures.add(pool.submit(() -> {
                    go.await();
                    return bridge.getAverageRate(config("/sites/a/config"));
                }));
            }
            go.countDown();

            // Relire chaque future : sans cela une levée dans un worker resterait invisible et le
            // test passerait à vide. C'est aussi ce qui vérifie que les perdants du verrou servent
            // bien la valeur, au lieu de repartir avec un repli.
            for (Future<Map<String, Object>> f : futures) {
                assertThat(f.get(10, TimeUnit.SECONDS)).containsEntry("average", 4.7);
            }
        } finally {
            pool.shutdownNow();
        }

        verify(upstream, times(1)).getAverageRate(any());
    }

    @Test
    void fetchReviews_callsUpstreamOnceWithinTheWindow() throws Exception {
        ReviewService upstream = upstreamWithOneReview();
        var bridge = bridge(upstream, "cache-rev-window");

        assertThat(bridge.fetchReviews(10, "PB", 4, config("/sites/a/config"))).hasSize(1);
        assertThat(bridge.fetchReviews(10, "PB", 4, config("/sites/a/config"))).hasSize(1);

        verify(upstream, times(1)).fetchReviews(anyInt(), any(), anyInt(), any());
    }

    @Test
    void fetchReviews_keepsOneEntryPerProductAndMinNote() throws Exception {
        ReviewService upstream = upstreamWithOneReview();
        var bridge = bridge(upstream, "cache-rev-key");

        bridge.fetchReviews(10, "PB", 4, config("/sites/a/config"));
        bridge.fetchReviews(10, "AUTO", 4, config("/sites/a/config"));
        bridge.fetchReviews(10, "PB", 3, config("/sites/a/config"));

        verify(upstream, times(3)).fetchReviews(anyInt(), any(), anyInt(), any());
    }

    /**
     * Une liste vide est mémorisée sur la fenêtre d'ÉCHEC, qu'elle vienne d'une exception ou d'un
     * retour vide.
     *
     * <p>Le legacy attrape lui-même l'{@code IOException} d'un timeout et renvoie une liste vide :
     * depuis le pont, une panne amont est indistinguable d'un site sans avis. Les mémoriser
     * différemment demanderait une information qu'on n'a pas ; les mémoriser toutes deux sur la
     * fenêtre longue laisserait le bloc vide pendant tout le TTL après le rétablissement de l'API.
     * On choisit donc la fenêtre courte pour les deux — le coût est de quelques appels par fenêtre
     * d'échec, la cardinalité étant celle des blocs {@code sofnt:avisClient}.
     */
    @Test
    void fetchReviews_memoizesAnEmptyListOnTheFailureWindow() {
        ReviewService failing = mock(ReviewService.class);
        when(failing.fetchReviews(anyInt(), any(), anyInt(), any()))
                .thenThrow(new RuntimeException("APIM down"));
        var onFailure = bridge(failing, "cache-rev-failure");

        assertThat(onFailure.fetchReviews(10, "PB", 4, config("/sites/a/config"))).isEmpty();
        clock.advance(FAILURE_TTL.plusSeconds(1));
        onFailure.fetchReviews(10, "PB", 4, config("/sites/a/config"));
        verify(failing, times(2)).fetchReviews(anyInt(), any(), anyInt(), any());

        ReviewService empty = mock(ReviewService.class);
        when(empty.fetchReviews(anyInt(), any(), anyInt(), any())).thenReturn(List.of());
        var onEmptyReturn = bridge(empty, "cache-rev-empty");

        assertThat(onEmptyReturn.fetchReviews(10, "PB", 4, config("/sites/a/config"))).isEmpty();
        clock.advance(FAILURE_TTL.plusSeconds(1));
        onEmptyReturn.fetchReviews(10, "PB", 4, config("/sites/a/config"));
        verify(empty, times(2)).fetchReviews(anyInt(), any(), anyInt(), any());

        // Et la fenêtre longue reste bien celle des listes NON vides : la fenêtre d'échec ne
        // s'applique qu'au vide, elle ne raccourcit pas la mémorisation nominale.
        ReviewService served = mock(ReviewService.class);
        when(served.fetchReviews(anyInt(), any(), anyInt(), any()))
                .thenReturn(List.of(new ObjectMapper().createObjectNode().put("rate", 5)));
        var onHit = bridge(served, "cache-rev-nonempty");

        onHit.fetchReviews(10, "PB", 4, config("/sites/a/config"));
        clock.advance(FAILURE_TTL.plusSeconds(1));
        onHit.fetchReviews(10, "PB", 4, config("/sites/a/config"));
        verify(served, times(1)).fetchReviews(anyInt(), any(), anyInt(), any());
    }

    /** Même propriété que ci-dessus sur l'autre lecteur : les deux portent le même verrou. */
    @SuppressWarnings("java:S2925") // l'attente simule l'aller-retour réseau : c'est elle qui crée la course
    @Test
    void fetchReviews_collapsesAConcurrentBurstIntoASingleUpstreamCall() throws Exception {
        int threads = 10;
        CountDownLatch go = new CountDownLatch(1);
        ReviewService upstream = mock(ReviewService.class);
        JsonNode review = new ObjectMapper().readTree("{\"firstname\":\"Marie\",\"rate\":5}");
        when(upstream.fetchReviews(anyInt(), any(), anyInt(), any())).thenAnswer(invocation -> {
            Thread.sleep(120);
            return List.of(review);
        });

        var bridge = bridge(upstream, "cache-rev-burst");
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        try {
            List<Future<List<Map<String, Object>>>> futures = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                futures.add(pool.submit(() -> {
                    go.await();
                    return bridge.fetchReviews(10, "PB", 4, config("/sites/a/config"));
                }));
            }
            go.countDown();

            // Les perdants du verrou doivent servir la valeur, pas un repli vide.
            for (Future<List<Map<String, Object>>> f : futures) {
                assertThat(f.get(10, TimeUnit.SECONDS)).hasSize(1);
            }
        } finally {
            pool.shutdownNow();
        }

        verify(upstream, times(1)).fetchReviews(anyInt(), any(), anyInt(), any());
    }

    @Test
    void fetchReviews_servesAnImmutableView() throws Exception {
        var bridge = bridge(upstreamWithOneReview(), "cache-rev-immutable");
        List<Map<String, Object>> served = bridge.fetchReviews(10, "PB", 4, config("/sites/a/config"));

        // L'entrée est partagée entre threads : un appelant ne doit pas pouvoir la modifier.
        assertThat(served).isUnmodifiable();
    }

    /**
     * {@code List.copyOf} refuse les éléments nuls. Sans filtre, un seul avis nul dans la charge
     * amont lèverait une NPE — attrapée, donc transformée en panne mémorisée pour toute la fenêtre
     * d'échec, alors que les autres avis étaient parfaitement lisibles.
     */
    @Test
    void fetchReviews_skipsANullEntryInsteadOfFailingTheWholeBlock() throws Exception {
        ReviewService upstream = mock(ReviewService.class);
        ObjectMapper mapper = new ObjectMapper();
        List<JsonNode> raw = new ArrayList<>();
        raw.add(mapper.readTree("{\"firstname\":\"Marie\",\"rate\":5}"));
        raw.add(mapper.readTree("null"));
        when(upstream.fetchReviews(anyInt(), any(), anyInt(), any())).thenReturn(raw);

        var bridge = bridge(upstream, "cache-rev-null-entry");

        assertThat(bridge.fetchReviews(10, "PB", 4, config("/sites/a/config"))).hasSize(1);

        // Mémorisé sur la fenêtre LONGUE : ce n'était pas une panne.
        clock.advance(FAILURE_TTL.plusSeconds(1));
        bridge.fetchReviews(10, "PB", 4, config("/sites/a/config"));
        verify(upstream, times(1)).fetchReviews(anyInt(), any(), anyInt(), any());
    }

    // ------------------------------------------------------------------ helpers

    private ReviewServiceBridge bridge(ReviewService upstream, String managerName) {
        return new ReviewServiceBridgeImpl(() -> upstream, clock, isolatedManager(managerName));
    }

    private static JCRNodeWrapper config(String path) {
        JCRNodeWrapper node = mock(JCRNodeWrapper.class);
        when(node.getPath()).thenReturn(path);
        return node;
    }

    private static ReviewService upstreamWithRate(double rate, int nbReview) {
        ReviewService upstream = mock(ReviewService.class);
        AverageRate average = mock(AverageRate.class);
        when(average.getRate()).thenReturn(rate);
        when(average.getNbReview()).thenReturn(nbReview);
        when(upstream.getAverageRate(any())).thenReturn(average);
        return upstream;
    }

    private static ReviewService upstreamWithOneReview() throws Exception {
        ReviewService upstream = mock(ReviewService.class);
        JsonNode node = new ObjectMapper().readTree("{\"firstname\":\"Marie\",\"rate\":5}");
        when(upstream.fetchReviews(anyInt(), any(), anyInt(), any())).thenReturn(List.of(node));
        return upstream;
    }

    /** Un gestionnaire par test : les cas restent indépendants les uns des autres. */
    private static CacheManager isolatedManager(String name) {
        CacheManager existing = CacheManager.getCacheManager(name);
        return existing != null ? existing : CacheManager.newInstance(new Configuration()
                .name(name)
                .defaultCache(new CacheConfiguration("default", 100)));
    }

    /** Horloge avançable — {@code Clock.fixed} ne suffit pas, il faut franchir les fenêtres. */
    private static final class MutableClock extends Clock {

        // `volatile` : le test avance l'horloge depuis son propre thread, les workers de la rafale
        // la lisent depuis les leurs. Le latch ne crée un happens-before que pour ce qui le précède.
        private volatile Instant now;

        private MutableClock(Instant start) {
            this.now = start;
        }

        void advance(Duration by) {
            now = now.plus(by);
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
