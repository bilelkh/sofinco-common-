package ch.sofinco.core.service;

import ch.sofinco.core.client.ApimSimulationClient;
import ch.sofinco.core.mapper.RepresentativeExampleMapper;
import ch.sofinco.core.model.representativeexample.LoanCalculateResponse;
import ch.sofinco.core.model.representativeexample.RevolvingCalculateResponse;
import ch.sofinco.core.model.representativeexample.SimulationRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import net.sf.ehcache.Cache;
import net.sf.ehcache.CacheManager;
import net.sf.ehcache.Ehcache;
import net.sf.ehcache.config.CacheConfiguration;
import net.sf.ehcache.config.Configuration;
import net.sf.ehcache.store.MemoryStoreEvictionPolicy;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapper;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Fixtures partagées par les tests de {@link RepresentativeExampleServiceImpl}. Centralise les
 * mocks et les helpers JCR pour réduire la duplication entre les 4 fichiers de test par concern
 * ({@code _Validation}, {@code _Resolution}, {@code _Routing}, {@code _RejectionReason}).
 *
 * <p>Package-private — usage exclusivement interne au paquet de tests.
 */
final class RepexFixtures {

    private RepexFixtures() {
        // util statique
    }

    static SimulationRequest req(String src, String product, Long amount, Long duration, String scale) {
        return new SimulationRequest(src, product, amount, duration, scale, null, null, true);
    }

    static SimulationRequest reqWithConfig(String src, String product, Long amount, Long duration,
                                           String scale, JCRNodeWrapper config) {
        return new SimulationRequest(src, product, amount, duration, scale, null, config, true);
    }

    static SimulationRequest reqWithOrigin(String src, String product, Long amount, Long duration,
                                           String scale, String requestOrigin) {
        return new SimulationRequest(src, product, amount, duration, scale, requestOrigin, null, true);
    }

    static LoanCalculateResponse loanFixture() throws Exception {
        return new ObjectMapper().readValue(
                RepexFixtures.class.getResourceAsStream("/mocks/loan_pb_response.json"),
                LoanCalculateResponse.class);
    }

    static RevolvingCalculateResponse revolvingFixture() throws Exception {
        return new ObjectMapper().readValue(
                RepexFixtures.class.getResourceAsStream("/mocks/revolving_cr_response.json"),
                RevolvingCalculateResponse.class);
    }

    /** Variantes Optional pour matcher la nouvelle signature {@code ApimSimulationClient}. */
    static Optional<LoanCalculateResponse> loanFixtureOpt() throws Exception {
        return Optional.of(loanFixture());
    }

    static Optional<RevolvingCalculateResponse> revolvingFixtureOpt() throws Exception {
        return Optional.of(revolvingFixture());
    }

    static RepresentativeExampleServiceImpl newService(ApimService apim, ApimSimulationClient client) {
        return new RepresentativeExampleServiceImpl(apim, client, new RepresentativeExampleMapper(),
                Clock.systemUTC());
    }

    static JCRNodeWrapper configNodeWith(Long defaultAmount, Long defaultDuration) throws Exception {
        JCRNodeWrapper node = mock(JCRNodeWrapper.class);
        if (defaultAmount != null) {
            stubLong(node, "defaultAmount", defaultAmount);
        }
        if (defaultDuration != null) {
            stubLong(node, "defaultDuration", defaultDuration);
        }
        return node;
    }

    static void stubLong(JCRNodeWrapper node, String prop, long value) throws Exception {
        JCRPropertyWrapper p = mock(JCRPropertyWrapper.class);
        when(node.hasProperty(prop)).thenReturn(true);
        when(node.getProperty(prop)).thenReturn(p);
        when(p.getLong()).thenReturn(value);
    }

    /** Stubs {@link ApimService} pour un appel APIM live prêt (non-mock, configuré). */
    static void apimReady(ApimService apim) {
        when(apim.isReady()).thenReturn(true);
        when(apim.isMockMode()).thenReturn(false);
        when(apim.getOrigin()).thenReturn("");
    }

    /** Stubs {@link ApimService} en mode mock. */
    static void apimMockMode(ApimService apim) {
        when(apim.isReady()).thenReturn(true);
        when(apim.isMockMode()).thenReturn(true);
        when(apim.getOrigin()).thenReturn("");
    }

    /**
     * Cache adossé à un vrai ehcache autonome — même magasin qu'en production, sans conteneur.
     *
     * <p>Un cache NOMMÉ DIFFÉREMMENT par appel : les tests restent isolés les uns des autres.
     *
     * <p>Le TTL ehcache est posé pour rester fidèle à la production, mais il ne pilote rien ici :
     * il s'appuie sur l'horloge murale, alors que les tests avancent une {@link ControlClock}.
     * C'est l'expiration calculée par {@code LastGoodExampleCache} qui fait foi.
     */
    static LastGoodExampleCache newCache(Duration ttl, int maxEntries, Clock clock) {
        String name = "repexTest-" + CACHE_SEQUENCE.incrementAndGet();
        Ehcache store = testCacheManager().addCacheIfAbsent(new Cache(
                new CacheConfiguration(name, maxEntries)
                        .eternal(false)
                        .timeToLiveSeconds(ttl.getSeconds())
                        .memoryStoreEvictionPolicy(MemoryStoreEvictionPolicy.LRU)));
        return new LastGoodExampleCache(store, ttl, clock);
    }

    private static final AtomicInteger CACHE_SEQUENCE = new AtomicInteger();
    private static volatile CacheManager testCacheManager;

    private static CacheManager testCacheManager() {
        if (testCacheManager == null) {
            synchronized (RepexFixtures.class) {
                if (testCacheManager == null) {
                    testCacheManager = CacheManager.newInstance(new Configuration()
                            .name("repexTestCacheManager")
                            .defaultCache(new CacheConfiguration("default", 100)));
                }
            }
        }
        return testCacheManager;
    }

    /** Horloge pilotée : teste les fenêtres de cache sans Thread.sleep. */
    static final class ControlClock extends Clock {

        private Instant now = Instant.parse("2026-01-01T10:00:00Z");

        void advance(Duration by) {
            now = now.plus(by);
        }

        @Override
        public Instant instant() {
            return now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }
    }
}
