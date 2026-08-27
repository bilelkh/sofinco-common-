package ch.sofinco.core.service;

import ch.sofinco.core.client.ApimSimulationClient;
import ch.sofinco.core.config.RepresentativeExampleConfig;
import ch.sofinco.core.exception.ApimException;
import ch.sofinco.core.model.representativeexample.CampaignResponse;
import net.sf.ehcache.CacheManager;
import net.sf.ehcache.config.Configuration;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Assemblage de {@link CampaignServiceImpl} : cache à deux fenêtres, verrou par provenance,
 * secours sur panne.
 *
 * <p>Les trois briques sont couvertes séparément ({@code LastGoodCampaignCache}, {@code KeyedLocks},
 * {@code ExampleCacheFactory}) ; ce fichier vérifie qu'elles sont câblées ensemble comme prévu —
 * c'est le câblage, pas les briques, qui se casse silencieusement lors d'une évolution.
 *
 * <p>Un {@code CacheManager} réel est utilisé plutôt qu'un faux : le service négocie son magasin
 * avec ehcache, et un test qui court-circuiterait cette négociation ne dirait rien du chemin de
 * production.
 */
class CampaignServiceImplTest {

    private static final String SOURCE = "NEOURL41";

    private final ApimService apim = mock(ApimService.class);
    private final ApimSimulationClient client = mock(ApimSimulationClient.class);
    /*
     * Forme QUALIFIÉE plutôt qu'import statique. `RepexFixtures` est package-private : javac
     * accepte d'en importer les membres, l'indexeur d'Eclipse ne les retrouve pas toujours et
     * produit alors une classe « Unresolved compilation problems » que Maven réutilise ensuite.
     * Même convention que RepresentativeExampleServiceImplTest.
     */
    private final RepexFixtures.ControlClock clock = new RepexFixtures.ControlClock();

    private CacheManager manager;

    @BeforeEach
    void openManager() {
        manager = CacheManager.newInstance(
                new Configuration().name("campaignServiceTest-" + System.nanoTime()));
    }

    @AfterEach
    void closeManager() {
        manager.shutdown();
    }

    // ------------------------------------------------------------------ fixtures

    private static CampaignResponse campaign(String id) {
        return new CampaignResponse(id, "loan", "PRÊT PERSONNEL",
                3001.0, 75000.0, 12, 120,
                4.314, 14.628, 4.4, 15.65, 4.9,
                "2017-09-25", "2026-08-26");
    }

    private static RepresentativeExampleConfig config(int freshSeconds, int ttlMinutes) {
        RepresentativeExampleConfig c = mock(RepresentativeExampleConfig.class);
        when(c.campaignFreshWindowSeconds()).thenReturn(freshSeconds);
        when(c.campaignLastGoodTtlMinutes()).thenReturn(ttlMinutes);
        when(c.campaignMaxEntries()).thenReturn(64);
        return c;
    }

    private CampaignServiceImpl service(RepresentativeExampleConfig config) {
        CampaignServiceImpl svc = new CampaignServiceImpl(apim, client, clock, manager);
        svc.activate(config);
        return svc;
    }

    // ------------------------------------------------------------------ validation

    @Test
    void blankSourceId_returnsEmptyWithoutTouchingApim() throws Exception {
        RepexFixtures.apimReady(apim);
        CampaignServiceImpl svc = service(config(1800, 240));

        assertThat(svc.getCampaign(null, null, null)).isEmpty();
        assertThat(svc.getCampaign("   ", null, null)).isEmpty();
        verify(client, never()).callCampaignApi(any(), any(), any());
    }

    @Test
    void apimNotReady_returnsEmpty() {
        when(apim.isReady()).thenReturn(false);
        assertThat(service(config(1800, 240)).getCampaign(SOURCE, null, null)).isEmpty();
    }

    /**
     * Le garde-fou couvre la VALIDATION, pas seulement l'appel. Une RuntimeException atteignant la
     * frontière JS de Jahia y cascade en « bodyEndTag is null », qui casse la page entière.
     */
    @Test
    void isReadyThrowing_returnsEmpty_ratherThanBreakingTheWholePage() {
        when(apim.isReady()).thenThrow(new IllegalStateException("APIM injoignable"));

        CampaignServiceImpl svc = service(config(1800, 240));
        assertThat(svc.getCampaign(SOURCE, null, null)).isEmpty();
    }

    // ------------------------------------------------------------------ cache

    @Test
    void withinTheFreshWindow_apimIsCalledOnce() throws Exception {
        RepexFixtures.apimReady(apim);
        AtomicInteger calls = new AtomicInteger();
        when(client.callCampaignApi(any(), any(), any())).thenAnswer(i -> {
            calls.incrementAndGet();
            return Optional.of(campaign(SOURCE));
        });

        CampaignServiceImpl svc = service(config(1800, 240));
        svc.getCampaign(SOURCE, null, null);
        clock.advance(Duration.ofMinutes(20));
        svc.getCampaign(SOURCE, null, null);

        assertThat(calls).hasValue(1);
    }

    @Test
    void pastTheFreshWindow_apimIsCalledAgain() throws Exception {
        RepexFixtures.apimReady(apim);
        AtomicInteger calls = new AtomicInteger();
        when(client.callCampaignApi(any(), any(), any())).thenAnswer(i -> {
            calls.incrementAndGet();
            return Optional.of(campaign(SOURCE));
        });

        CampaignServiceImpl svc = service(config(1800, 240));
        svc.getCampaign(SOURCE, null, null);
        clock.advance(Duration.ofMinutes(31));
        svc.getCampaign(SOURCE, null, null);

        assertThat(calls).hasValue(2);
    }

    /** Deux provenances ne partagent pas d'entrée : la clé du cache EST la provenance. */
    @Test
    void twoSourcesAreCachedSeparately() throws Exception {
        RepexFixtures.apimReady(apim);
        when(client.callCampaignApi(any(), any(), any()))
                .thenAnswer(i -> Optional.of(campaign(i.getArgument(0))));

        CampaignServiceImpl svc = service(config(1800, 240));

        assertThat(svc.getCampaign("NEOURL41", null, null)).get()
                .extracting(CampaignResponse::id).isEqualTo("NEOURL41");
        assertThat(svc.getCampaign("NEOURL02", null, null)).get()
                .extracting(CampaignResponse::id).isEqualTo("NEOURL02");
    }

    /**
     * MODE MOCK : rien n'est mémorisé. Une réponse fabriquée ne doit pas survivre à un basculement
     * vers l'APIM réel — c'est un risque de conformité, pas une question de performance.
     */
    @Test
    void mockMode_neverCaches() throws Exception {
        when(apim.isReady()).thenReturn(true);
        when(apim.isMockMode()).thenReturn(true);
        when(apim.getOrigin()).thenReturn("");
        AtomicInteger calls = new AtomicInteger();
        when(client.callCampaignApi(any(), any(), any())).thenAnswer(i -> {
            calls.incrementAndGet();
            return Optional.of(campaign(SOURCE));
        });

        CampaignServiceImpl svc = service(config(1800, 240));
        svc.getCampaign(SOURCE, null, null);
        svc.getCampaign(SOURCE, null, null);

        assertThat(calls).hasValue(2);
    }

    // ------------------------------------------------------------------ secours

    /**
     * Les bornes de taux figurent dans des mentions légales : mieux vaut une valeur de la veille
     * qu'un jeton brut affiché au visiteur.
     */
    @Test
    void whenApimFailsAfterASuccess_theLastGoodValueIsServed() throws Exception {
        RepexFixtures.apimReady(apim);
        when(client.callCampaignApi(any(), any(), any())).thenReturn(Optional.of(campaign(SOURCE)));

        CampaignServiceImpl svc = service(config(60, 240));
        assertThat(svc.getCampaign(SOURCE, null, null)).isPresent();

        // Hors fenêtre nominale, et l'APIM tombe.
        clock.advance(Duration.ofMinutes(5));
        when(client.callCampaignApi(any(), any(), any())).thenThrow(new ApimException("503"));

        assertThat(svc.getCampaign(SOURCE, null, null))
                .as("le secours doit resservir la dernière campagne valide")
                .isPresent();
    }

    /** Passé la fenêtre de secours, on ne sert plus rien plutôt que des chiffres périmés. */
    @Test
    void pastTheRescueWindow_nothingIsServed() throws Exception {
        RepexFixtures.apimReady(apim);
        when(client.callCampaignApi(any(), any(), any())).thenReturn(Optional.of(campaign(SOURCE)));

        CampaignServiceImpl svc = service(config(60, 10));
        svc.getCampaign(SOURCE, null, null);

        clock.advance(Duration.ofMinutes(11));
        when(client.callCampaignApi(any(), any(), any())).thenThrow(new IOException("réseau"));

        assertThat(svc.getCampaign(SOURCE, null, null)).isEmpty();
    }

    @Test
    void anEmptyApimResponse_withoutAnyLastGood_yieldsEmpty() throws Exception {
        RepexFixtures.apimReady(apim);
        when(client.callCampaignApi(any(), any(), any())).thenReturn(Optional.empty());

        assertThat(service(config(1800, 240)).getCampaign(SOURCE, null, null)).isEmpty();
    }

    // ------------------------------------------------------------------ concurrence

    /**
     * Un seul appel en vol par provenance : la rafale de reprise après purge s'effondre en une
     * requête. L'attente explicite est l'objet même du test — sans fenêtre laissée aux autres
     * threads pour se présenter au verrou, la ruée ne se forme pas.
     */
    @SuppressWarnings("java:S2925")
    @Test
    void underStampede_onlyOneApimCallIsMade() throws Exception {
        RepexFixtures.apimReady(apim);
        AtomicInteger calls = new AtomicInteger();
        CountDownLatch insideCall = new CountDownLatch(1);
        CountDownLatch firstReached = new CountDownLatch(1);

        when(client.callCampaignApi(any(), any(), any())).thenAnswer(i -> {
            calls.incrementAndGet();
            firstReached.countDown();
            insideCall.await(5, TimeUnit.SECONDS);
            return Optional.of(campaign(SOURCE));
        });

        CampaignServiceImpl svc = service(config(1800, 240));

        int n = 10;
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CyclicBarrier barrier = new CyclicBarrier(n);
        try {
            var futures = IntStream.range(0, n)
                    .mapToObj(i -> pool.submit(() -> {
                        barrier.await();
                        return svc.getCampaign(SOURCE, null, null);
                    }))
                    .toList();

            assertThat(firstReached.await(5, TimeUnit.SECONDS)).isTrue();
            Thread.sleep(100);
            insideCall.countDown();

            for (Future<Optional<CampaignResponse>> f : futures) {
                assertThat(f.get(5, TimeUnit.SECONDS)).isPresent();
            }
            assertThat(calls)
                    .as("un seul appel APIM sous ruée de %d threads", n)
                    .hasValue(1);
        } finally {
            pool.shutdownNow();
        }
    }

    // ------------------------------------------------------------------ cycle de vie

    /** Reconfigurer VIDE le cache : c'est aussi le levier manuel de l'exploitation. */
    @Test
    void reconfiguring_emptiesTheCache() throws Exception {
        RepexFixtures.apimReady(apim);
        AtomicInteger calls = new AtomicInteger();
        when(client.callCampaignApi(any(), any(), any())).thenAnswer(i -> {
            calls.incrementAndGet();
            return Optional.of(campaign(SOURCE));
        });

        CampaignServiceImpl svc = service(config(1800, 240));
        svc.getCampaign(SOURCE, null, null);
        svc.modified(config(1800, 240));
        svc.getCampaign(SOURCE, null, null);

        assertThat(calls).hasValue(2);
    }

    /** Valeurs de configuration absurdes : on retombe sur les défauts, jamais d'échec d'activation. */
    @Test
    void outOfRangeConfiguration_fallsBackToDefaults() {
        RepexFixtures.apimReady(apim);
        assertThatCode(() -> service(config(-1, 0))).doesNotThrowAnyException();
    }

    @Test
    void deactivate_isIdempotent() {
        RepexFixtures.apimReady(apim);
        CampaignServiceImpl svc = service(config(1800, 240));
        assertThatCode(() -> {
            svc.deactivate();
            svc.deactivate();
        }).doesNotThrowAnyException();
    }
}
