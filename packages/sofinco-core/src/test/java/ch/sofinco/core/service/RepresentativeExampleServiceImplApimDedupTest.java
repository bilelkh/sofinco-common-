package ch.sofinco.core.service;

import ch.sofinco.core.client.ApimSimulationClient;
import ch.sofinco.core.exception.ApimException;
import ch.sofinco.core.mapper.RepresentativeExampleMapper;
import ch.sofinco.core.model.representativeexample.RepresentativeExample;
import ch.sofinco.core.model.representativeexample.SimulationRequest;
import ch.sofinco.core.observability.MetricsRecorder;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static ch.sofinco.core.service.RepexFixtures.ControlClock;
import static ch.sofinco.core.service.RepexFixtures.apimMockMode;
import static ch.sofinco.core.service.RepexFixtures.apimReady;
import static ch.sofinco.core.service.RepexFixtures.loanFixture;
import static ch.sofinco.core.service.RepexFixtures.req;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Dédoublonnage des appels APIM : fenêtre de fraîcheur et verrou par configuration.
 *
 * <p>Le cache de fragments Jahia absorbe le trafic ; ces deux mécanismes ne visent que la
 * <b>reprise après purge ou déploiement</b>, où plusieurs pages partageant la même configuration
 * se re-rendent en même temps.
 */
class RepresentativeExampleServiceImplApimDedupTest {

    private final ApimService apim = mock(ApimService.class);
    private final ApimSimulationClient client = mock(ApimSimulationClient.class);

    // ------------------------------------------------------------------ fenêtre de fraîcheur

    @Test
    void secondCallWithinTheWindow_doesNotReachApim() throws Exception {
        apimReady(apim);
        AtomicInteger calls = countingLoanClient();
        RepresentativeExampleServiceImpl service = service(new ControlClock());

        assertThat(service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"))).isPresent();
        assertThat(service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"))).isPresent();

        assertThat(calls).hasValue(1);
    }

    @Test
    void pastTheWindow_reachesApimAgain() throws Exception {
        apimReady(apim);
        AtomicInteger calls = countingLoanClient();
        ControlClock clock = new ControlClock();
        RepresentativeExampleServiceImpl service = service(clock);

        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));
        clock.advance(Duration.ofSeconds(61));
        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));

        assertThat(calls).hasValue(2);
    }

    @Test
    void differentParameters_areNeverShared() throws Exception {
        apimReady(apim);
        AtomicInteger calls = countingLoanClient();
        RepresentativeExampleServiceImpl service = service(new ControlClock());

        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));
        service.getExample(req("PBPERSO", "PB", 3000L, 36L, "CRBP"));

        assertThat(calls).hasValue(2);
    }

    // ------------------------------------------------------------------ verrou par configuration

    /**
     * Le test qui justifie le verrou. Sans lui, les dix threads manquent tous le cache avant que
     * la première réponse ne l'alimente, et dix appels identiques partent — exactement le pic de
     * charge sur l'APIM au moment d'une reprise après purge.
     */
    @SuppressWarnings("java:S2925") // l'attente simule l'aller-retour réseau : c'est elle qui crée la course
    @Test
    void aConcurrentBurstCollapsesToASingleApimCall() throws Exception {
        apimReady(apim);
        AtomicInteger calls = new AtomicInteger();
        CountDownLatch go = new CountDownLatch(1);

        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenAnswer(i -> {
            calls.incrementAndGet();
            Thread.sleep(120);   // élargit la fenêtre de course, comme un vrai aller-retour réseau
            return Optional.of(loanFixture());
        });

        RepresentativeExampleServiceImpl service = service(new ControlClock());
        ExecutorService pool = Executors.newFixedThreadPool(10);
        try {
            List<Future<Optional<RepresentativeExample>>> futures = new ArrayList<>();
            for (int i = 0; i < 10; i++) {
                futures.add(pool.submit(() -> {
                    go.await();
                    return service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));
                }));
            }
            go.countDown();

            for (Future<Optional<RepresentativeExample>> f : futures) {
                assertThat(f.get(10, TimeUnit.SECONDS)).isPresent();
            }
        } finally {
            pool.shutdownNow();
        }

        assertThat(calls).hasValue(1);
    }

    // ------------------------------------------------------------------ politique de cache

    /**
     * L'aperçu est la surface où le contributeur VÉRIFIE ses chiffres avant publication. Lui
     * resservir une valeur mémorisée viderait la vérification de son sens — et sans bénéfice,
     * le cache de fragments de Jahia étant lui-même inactif hors live.
     */
    @Test
    void previewWorkspace_neverCaches() throws Exception {
        apimReady(apim);
        AtomicInteger calls = countingLoanClient();
        RepresentativeExampleServiceImpl service = service(new ControlClock());

        service.getExample(preview());
        service.getExample(preview());

        assertThat(calls).hasValue(2);
    }

    /** Et le live, lui, mémorise — les deux chemins ne se mélangent pas. */
    @Test
    void liveWorkspace_stillCaches() throws Exception {
        apimReady(apim);
        AtomicInteger calls = countingLoanClient();
        RepresentativeExampleServiceImpl service = service(new ControlClock());

        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));
        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));

        assertThat(calls).hasValue(1);
    }

    /** Une réponse mock figée ne doit jamais survivre à un basculement live. */
    @Test
    void mockMode_neverCaches() throws Exception {
        apimMockMode(apim);
        AtomicInteger calls = countingLoanClient();
        RepresentativeExampleServiceImpl service = service(new ControlClock());

        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));
        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));

        assertThat(calls).hasValue(2);
    }

    /**
     * Seuls les succès sont mémorisés : un incident APIM de trente secondes ne doit pas devenir
     * permanent en figeant une absence de donnée.
     */
    @Test
    void aFailedCallIsNotCached_andTheNextRequestRetries() throws Exception {
        apimReady(apim);
        AtomicInteger calls = new AtomicInteger();
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenAnswer(i ->
                calls.incrementAndGet() == 1
                        ? Optional.empty()               // incident transitoire
                        : Optional.of(loanFixture()));   // APIM rétabli

        RepresentativeExampleServiceImpl service = service(new ControlClock());

        assertThat(service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"))).isEmpty();
        assertThat(service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"))).isPresent();
        assertThat(calls).hasValue(2);
    }

    @Test
    void anApimExceptionIsNotCached_andTheNextRequestRetries() throws Exception {
        apimReady(apim);
        AtomicInteger calls = new AtomicInteger();
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenAnswer(i -> {
            if (calls.incrementAndGet() == 1) {
                throw new ApimException("APIM injoignable");
            }
            return Optional.of(loanFixture());
        });

        RepresentativeExampleServiceImpl service = service(new ControlClock());

        assertThat(service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"))).isEmpty();
        assertThat(service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"))).isPresent();
        assertThat(calls).hasValue(2);
    }

    // ------------------------------------------------------------------ observabilité

    /** Sans ce tag, le gain du dédoublonnage n'est pas mesurable en production. */
    @Test
    void aCacheHitIsTaggedSourceCache() throws Exception {
        apimReady(apim);
        countingLoanClient();
        List<String> sources = new ArrayList<>();
        MetricsRecorder recorder = (name, tags) -> {
            for (int i = 0; i + 1 < tags.length; i += 2) {
                if ("source".equals(tags[i])) {
                    sources.add(tags[i + 1]);
                }
            }
        };
        RepresentativeExampleServiceImpl service = new RepresentativeExampleServiceImpl(
                apim, client, new RepresentativeExampleMapper(), new ControlClock(), recorder);

        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));
        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));

        assertThat(sources).containsExactly("apim", "cache");
    }

    // ------------------------------------------------------------------ helpers

    private RepresentativeExampleServiceImpl service(ControlClock clock) {
        return new RepresentativeExampleServiceImpl(apim, client, new RepresentativeExampleMapper(), clock);
    }

    /** Même requête, mais rendue depuis le workspace {@code default} — aperçu ou édition. */
    private static SimulationRequest preview() {
        return new SimulationRequest("PBPERSO", "PB", 15000L, 48L, "CRBP", null, null, false);
    }

    private AtomicInteger countingLoanClient() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenAnswer(i -> {
            calls.incrementAndGet();
            return Optional.of(loanFixture());
        });
        return calls;
    }
}
