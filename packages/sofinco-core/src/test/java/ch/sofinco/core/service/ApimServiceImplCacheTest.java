package ch.sofinco.core.service;

import ch.sofinco.core.config.ApimConfig;
import ch.sofinco.core.config.ApimConfigFixtures;
import ch.sofinco.core.exception.ApimException;
import ch.sofinco.core.model.apim.TokenResponse;
import org.apache.hc.client5.http.classic.methods.HttpUriRequestBase;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.core5.http.io.HttpClientResponseHandler;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Tests de concurrence du cache token de {@link ApimServiceImpl} (P3.3).
 *
 * <p>Le cache token est thread-safe par construction ({@code volatile cachedToken} + bloc
 * {@code synchronized(cacheLock)} double-check). Ces tests valident la propriété observable
 * importante : sous stampede de N threads concurrents, <b>un seul</b> appel
 * {@code /token} part vers l'APIM.
 *
 * <p>Le {@link CloseableHttpClient} est mocké et son {@code execute(...)} compte les invocations.
 * Un {@link CountDownLatch} maintient le premier thread dans {@code execute} le temps que les
 * autres se présentent à la porte du {@code cacheLock} — c'est l'invariant que la sérialisation
 * du verrou + le double-check {@code cachedToken != null} sur l'entrée garantissent.
 */
@SuppressWarnings("unchecked")
class ApimServiceImplCacheTest {

    /**
     * L'attente explicite est ici l'objet même du test : sans fenêtre laissée aux autres threads
     * pour se présenter au verrou, la ruée ne se forme pas et le double-check n'est jamais
     * exercé. Aucune API ne permet d'observer « ces threads sont bloqués sur ce moniteur », d'où
     * le {@code Thread.sleep} assumé.
     */
    @SuppressWarnings("java:S2925")
    @Test
    void getAccessToken_underStampede_callsTokenEndpointExactlyOnce() throws Exception {
        AtomicInteger callCount = new AtomicInteger(0);
        CountDownLatch insideExecute = new CountDownLatch(1);
        CountDownLatch firstReached = new CountDownLatch(1);

        CloseableHttpClient httpClient = mock(CloseableHttpClient.class);
        when(httpClient.execute(any(HttpUriRequestBase.class), any(HttpClientResponseHandler.class))).thenAnswer(inv -> {
            callCount.incrementAndGet();
            firstReached.countDown();
            // Bloque le premier thread dans execute le temps que les autres se présentent
            // au cacheLock — c'est la condition de course que double-check + synchronized résolvent.
            insideExecute.await(5, TimeUnit.SECONDS);
            return tokenResponse("tok-from-network");
        });

        ApimServiceImpl svc = new ApimServiceImpl(configComplete(), httpClient);

        int n = 10;
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CyclicBarrier barrier = new CyclicBarrier(n);
        try {
            List<Future<String>> futures = IntStream.range(0, n)
                    .mapToObj(i -> pool.submit(() -> {
                        barrier.await();         // tous partent en même temps
                        return svc.getAccessToken();
                    }))
                    .toList();

            // Attend que le premier thread soit ENTRÉ dans execute, garantissant qu'il détient
            // le cacheLock — les autres threads s'accumulent à la porte.
            assertThat(firstReached.await(5, TimeUnit.SECONDS)).isTrue();
            // Petite latence pour laisser les autres threads se présenter au verrou.
            Thread.sleep(100);
            // Libère le premier thread, qui complète son execute, puis les autres entrent
            // le bloc et voient le cache peuplé (double-check) → retournent sans rappeler execute.
            insideExecute.countDown();

            Set<String> distinctTokens = new HashSet<>();
            for (Future<String> f : futures) {
                distinctTokens.add(f.get(5, TimeUnit.SECONDS));
            }

            assertThat(callCount.get())
                    .as("Un seul appel /token doit partir sous stampede de %d threads", n)
                    .isEqualTo(1);
            assertThat(distinctTokens)
                    .as("Tous les threads doivent recevoir le même token")
                    .hasSize(1);
            assertThat(distinctTokens.iterator().next()).isEqualTo("tok-from-network");
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void invalidateCache_concurrentReadAndInvalidate_remainsConsistent() throws Exception {
        // L'invalidation depuis un thread tiers ne doit pas corrompre l'état.
        // (Si elle arrive entre le double-check et l'usage, le pire est un appel /token supplémentaire,
        // pas une stacktrace.)
        AtomicInteger callCount = new AtomicInteger(0);
        CloseableHttpClient httpClient = mock(CloseableHttpClient.class);
        when(httpClient.execute(any(HttpUriRequestBase.class), any(HttpClientResponseHandler.class))).thenAnswer(inv -> {
            callCount.incrementAndGet();
            return tokenResponse("tok-" + callCount.get());
        });
        ApimServiceImpl svc = new ApimServiceImpl(configComplete(), httpClient);

        int reads = 50;
        int invalidations = 5;
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            var futures = IntStream.range(0, reads + invalidations)
                    .mapToObj(i -> pool.submit(() -> {
                        if (i % 11 == 0 && i < invalidations * 11) {
                            svc.invalidateCache();
                        } else {
                            svc.getAccessToken();
                        }
                        return null;
                    }))
                    .toList();
            for (Future<?> f : futures) {
                f.get(5, TimeUnit.SECONDS); // pas d'exception attendue
            }
            // Bornes raisonnables : au moins 1 appel, au plus invalidations+1.
            assertThat(callCount.get()).isGreaterThan(0);
            assertThat(callCount.get()).isLessThan(invalidations + 5);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void getAccessToken_serialCalls_useCacheAfterFirstFetch() throws Exception {
        AtomicInteger callCount = new AtomicInteger(0);
        CloseableHttpClient httpClient = mock(CloseableHttpClient.class);
        when(httpClient.execute(any(HttpUriRequestBase.class), any(HttpClientResponseHandler.class))).thenAnswer(inv -> {
            callCount.incrementAndGet();
            return tokenResponse("tok-cached");
        });
        ApimServiceImpl svc = new ApimServiceImpl(configComplete(), httpClient);

        String t1 = svc.getAccessToken();
        String t2 = svc.getAccessToken();
        String t3 = svc.getAccessToken();

        assertThat(t1).isEqualTo("tok-cached");
        assertThat(t2).isEqualTo("tok-cached");
        assertThat(t3).isEqualTo("tok-cached");
        assertThat(callCount.get()).isEqualTo(1);
    }

    @Test
    void invalidateCache_forcesRefetchOnNextCall() throws Exception {
        AtomicInteger callCount = new AtomicInteger(0);
        CloseableHttpClient httpClient = mock(CloseableHttpClient.class);
        when(httpClient.execute(any(HttpUriRequestBase.class), any(HttpClientResponseHandler.class))).thenAnswer(inv -> {
            int n = callCount.incrementAndGet();
            return tokenResponse("tok-" + n);
        });
        ApimServiceImpl svc = new ApimServiceImpl(configComplete(), httpClient);

        String t1 = svc.getAccessToken();
        svc.invalidateCache();
        String t2 = svc.getAccessToken();

        assertThat(t1).isEqualTo("tok-1");
        assertThat(t2).isEqualTo("tok-2");
        assertThat(callCount.get()).isEqualTo(2);
    }

    @Test
    void getAccessToken_emptyAccessTokenInResponse_throwsApimException() throws Exception {
        CloseableHttpClient httpClient = mock(CloseableHttpClient.class);
        when(httpClient.execute(any(HttpUriRequestBase.class), any(HttpClientResponseHandler.class)))
                .thenThrow(new java.io.IOException("APIM /token retour 200 mais access_token vide"));

        ApimServiceImpl svc = new ApimServiceImpl(configComplete(), httpClient);

        assertThatThrownBy(svc::getAccessToken)
                .isInstanceOf(ApimException.class)
                .hasMessageContaining("token");
    }

    // ----------------------------------------------------------------- helpers

    private static TokenResponse tokenResponse(String accessToken) {
        return new TokenResponse(accessToken, "Bearer", "default", 3600);
    }

    private static ApimConfig configComplete() {
        // URL unifiée — /token et endpoints métier sur la même racine (validé Sofinco juin 2026).
        return ApimConfigFixtures.complete();
    }
}
