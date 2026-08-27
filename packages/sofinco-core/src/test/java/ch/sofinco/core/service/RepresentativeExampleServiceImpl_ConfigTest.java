package ch.sofinco.core.service;

import ch.sofinco.core.client.ApimSimulationClient;
import ch.sofinco.core.config.RepresentativeExampleConfig;
import ch.sofinco.core.mapper.RepresentativeExampleMapper;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static ch.sofinco.core.service.RepexFixtures.ControlClock;
import static ch.sofinco.core.service.RepexFixtures.apimReady;
import static ch.sofinco.core.service.RepexFixtures.loanFixture;
import static ch.sofinco.core.service.RepexFixtures.req;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Configuration OSGi de la fenêtre de fraîcheur : application, bornes, et purge à la
 * reconfiguration.
 */
class RepresentativeExampleServiceImpl_ConfigTest {

    private final ApimService apim = mock(ApimService.class);
    private final ApimSimulationClient client = mock(ApimSimulationClient.class);

    // ------------------------------------------------------------------ application

    /** Sans configuration déposée, les défauts de l'annotation s'appliquent : 60 s. */
    @Test
    void defaultWindow_isSixtySeconds() throws Exception {
        apimReady(apim);
        AtomicInteger calls = countingClient();
        ControlClock clock = new ControlClock();
        RepresentativeExampleServiceImpl service = service(clock);
        service.activate(config(60, 30, 256));

        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));
        clock.advance(Duration.ofSeconds(59));
        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));

        assertThat(calls).hasValue(1);
    }

    @Test
    void aLongerWindow_isHonoured() throws Exception {
        apimReady(apim);
        AtomicInteger calls = countingClient();
        ControlClock clock = new ControlClock();
        RepresentativeExampleServiceImpl service = service(clock);
        service.activate(config(900, 30, 256));   // 15 minutes

        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));
        clock.advance(Duration.ofMinutes(14));
        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));

        assertThat(calls).hasValue(1);
    }

    /** Fenêtre à zéro : dédoublonnage désactivé. Le verrou, lui, reste actif. */
    @Test
    void zeroWindow_disablesDeduplication() throws Exception {
        apimReady(apim);
        AtomicInteger calls = countingClient();
        RepresentativeExampleServiceImpl service = service(new ControlClock());
        service.activate(config(0, 30, 256));

        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));
        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));

        assertThat(calls).hasValue(2);
    }

    // ------------------------------------------------------------------ purge

    /**
     * Reconfigurer vide le cache. C'est le seul levier de purge manuelle : ce cache n'est pas
     * enregistré auprès de {@code CacheService}, donc « Vider tous les caches » ne l'atteint pas.
     */
    @Test
    void reconfiguring_clearsTheCache() throws Exception {
        apimReady(apim);
        AtomicInteger calls = countingClient();
        RepresentativeExampleServiceImpl service = service(new ControlClock());
        service.activate(config(60, 30, 256));

        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));
        assertThat(calls).hasValue(1);

        service.modified(config(60, 30, 256));   // même valeurs : c'est la purge qui est testée

        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));
        assertThat(calls).hasValue(2);
    }

    // ------------------------------------------------------------------ bornes

    /**
     * Une faute de frappe ne doit pas désactiver le secours d'une mention légale obligatoire :
     * les valeurs absurdes retombent sur les défauts.
     */
    @Test
    void outOfRangeValues_fallBackToDefaults() throws Exception {
        apimReady(apim);
        countingClient();
        ControlClock clock = new ControlClock();
        RepresentativeExampleServiceImpl service = service(clock);
        service.activate(config(-5, 0, -1));

        // Fenêtre négative → ramenée à 0, donc pas de dédoublonnage. Le secours, lui, conserve
        // son TTL par défaut de 30 min : c'est ce que la retombée protège.
        assertThat(service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"))).isPresent();
        clock.advance(Duration.ofMinutes(29));

        // `doReturn` et non `when(...)` : ce dernier INVOQUERAIT la méthode déjà stubbée et
        // fausserait le compteur.
        doReturn(Optional.empty()).when(client)
                .callLoanApi(any(), anyLong(), anyLong(), any(), any());

        // Le 2e rendu rappelle bien l'APIM (dédoublonnage désactivé), l'appel échoue, et le
        // secours répond car on est dans les 30 min par défaut. `verify` plutôt qu'un compteur :
        // le re-stub a remplacé la réponse comptante.
        assertThat(service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"))).isPresent();
        verify(client, times(2)).callLoanApi(any(), anyLong(), anyLong(), any(), any());
    }

    // ------------------------------------------------------------------ helpers

    private RepresentativeExampleServiceImpl service(ControlClock clock) {
        return new RepresentativeExampleServiceImpl(apim, client, new RepresentativeExampleMapper(), clock);
    }

    private AtomicInteger countingClient() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenAnswer(i -> {
            calls.incrementAndGet();
            return Optional.of(loanFixture());
        });
        return calls;
    }

    /** L'annotation de configuration est une interface : on l'instancie à la main. */
    private static RepresentativeExampleConfig config(int windowSeconds, int ttlMinutes, int maxEntries) {
        RepresentativeExampleConfig config = mock(RepresentativeExampleConfig.class);
        when(config.freshWindowSeconds()).thenReturn(windowSeconds);
        when(config.lastGoodTtlMinutes()).thenReturn(ttlMinutes);
        when(config.maxEntries()).thenReturn(maxEntries);
        return config;
    }
}
