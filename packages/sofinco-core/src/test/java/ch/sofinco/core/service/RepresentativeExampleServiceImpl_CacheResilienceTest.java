package ch.sofinco.core.service;

import ch.sofinco.core.client.ApimSimulationClient;
import ch.sofinco.core.config.RepresentativeExampleConfig;
import ch.sofinco.core.mapper.RepresentativeExampleMapper;
import net.sf.ehcache.CacheManager;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static ch.sofinco.core.service.RepexFixtures.ControlClock;
import static ch.sofinco.core.service.RepexFixtures.apimReady;
import static ch.sofinco.core.service.RepexFixtures.loanFixture;
import static ch.sofinco.core.service.RepexFixtures.req;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Le cache est une OPTIMISATION : il ne doit jamais conditionner le rendu de l'exemple
 * représentatif, qui est une mention légale obligatoire.
 *
 * <p>Ces cas reproduisent la panne rencontrée en recette : {@code CacheProvider.getCacheManager()}
 * est une méthode PAR DÉFAUT renvoyant {@code null}. Avec une référence obligatoire et sans repli,
 * l'activation levait une NPE, le service disparaissait, le bridge avec — et les jetons
 * {@code {{taea}}} partaient bruts vers le visiteur.
 */
class RepresentativeExampleServiceImpl_CacheResilienceTest {

    private final ApimService apim = mock(ApimService.class);
    private final ApimSimulationClient client = mock(ApimSimulationClient.class);

    /** Aucun gestionnaire de caches joignable : le service doit s'activer quand même. */
    @Test
    void noCacheManager_activatesAndStillRenders() throws Exception {
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any()))
                .thenAnswer(i -> Optional.of(loanFixture()));

        RepresentativeExampleServiceImpl service = new RepresentativeExampleServiceImpl(
                apim, client, new RepresentativeExampleMapper(), new ControlClock(), null,
                (CacheManager) null);

        assertThatCode(() -> service.activate(config())).doesNotThrowAnyException();
        assertThat(service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"))).isPresent();
    }

    /** Et le dédoublonnage continue de fonctionner sur le cache de repli. */
    @Test
    void theFallbackCacheStillDeduplicates() throws Exception {
        apimReady(apim);
        java.util.concurrent.atomic.AtomicInteger calls = new java.util.concurrent.atomic.AtomicInteger();
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenAnswer(i -> {
            calls.incrementAndGet();
            return Optional.of(loanFixture());
        });

        RepresentativeExampleServiceImpl service = new RepresentativeExampleServiceImpl(
                apim, client, new RepresentativeExampleMapper(), new ControlClock(), null,
                (CacheManager) null);
        service.activate(config());

        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));
        service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"));

        assertThat(calls).hasValue(1);
    }

    /**
     * {@link RepresentativeExampleConfig} est un type ANNOTATION : l'implémenter déclenche
     * l'avertissement {@code intf-annotation}. Un mock l'évite.
     */
    private static RepresentativeExampleConfig config() {
        RepresentativeExampleConfig config = mock(RepresentativeExampleConfig.class);
        when(config.freshWindowSeconds()).thenReturn(60);
        when(config.lastGoodTtlMinutes()).thenReturn(30);
        when(config.maxEntries()).thenReturn(256);
        return config;
    }
}
