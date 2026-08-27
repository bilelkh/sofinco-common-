package ch.sofinco.core.client;

import ch.sofinco.core.config.ApimConfig;
import ch.sofinco.core.config.ApimConfigFixtures;
import ch.sofinco.core.service.ApimService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Bascule mock ↔ HTTP du seul composant exposé au registre OSGi.
 *
 * <p>Le delegate n'est pas observable directement : on l'identifie par son COMPORTEMENT. Le mock
 * lit une fixture et répond ; l'implémentation HTTP demande son client à {@link ApimService}, qui
 * n'en fournit aucun ici — d'où une {@link IOException}. Deux signatures nettes, sans appel réseau.
 */
class ApimSimulationClientFactoryTest {

    private final ApimService apimService = mock(ApimService.class);
    private final ApimSimulationClientFactory factory = new ApimSimulationClientFactory(apimService);

    /**
     * Configuration minimale pour que l'implémentation HTTP aille jusqu'au bout de sa construction
     * d'URL. On lui laisse ensuite manquer son client partagé : c'est l'échec attendu, et il
     * identifie le delegate sans jamais ouvrir de connexion.
     */
    @BeforeEach
    void stubMinimalApimService() {
        when(apimService.getPartnerId()).thenReturn("web_sofinco");
        when(apimService.getApiUrl()).thenReturn("https://rct-api.sofinco.fr");
        when(apimService.getHttpClient()).thenReturn(null);   // ← d'où l'IOException
    }

    // ------------------------------------------------------------------ choix du delegate

    @Test
    void mockMode_bindsTheFixtureBackedClient() throws Exception {
        factory.activate(cfg(true));

        assertThat(factory.callLoanApi("PBPERSO", 15000L, 48L, null, null)).isPresent();
    }

    @Test
    void liveMode_bindsTheHttpClient() {
        factory.activate(cfg(false));

        // `apimService.getHttpClient()` renvoie null (mock non stubbé) → l'implémentation HTTP
        // le signale. C'est la preuve que c'est bien elle qui a été liée.
        assertThatThrownBy(() -> factory.callLoanApi("PBPERSO", 15000L, 48L, null, null))
                .isInstanceOf(IOException.class);
    }

    /** Configuration absente à l'activation : on ne bascule pas en mock par accident. */
    @Test
    void nullConfig_isTreatedAsLive() {
        factory.activate(null);

        assertThatThrownBy(() -> factory.callLoanApi("PBPERSO", 15000L, 48L, null, null))
                .isInstanceOf(IOException.class);
    }

    @Test
    void revolvingCallsGoThroughTheSameDelegate() throws Exception {
        factory.activate(cfg(true));

        assertThat(factory.callRevolvingApi("RESERVE", 3000L, 36L, null)).isPresent();
    }

    // ------------------------------------------------------------------ reconfiguration

    @Test
    void switchingFromMockToLive_swapsTheDelegate() throws Exception {
        factory.activate(cfg(true));
        assertThat(factory.callLoanApi("PBPERSO", 15000L, 48L, null, null)).isPresent();

        factory.modified(cfg(false));

        assertThatThrownBy(() -> factory.callLoanApi("PBPERSO", 15000L, 48L, null, null))
                .isInstanceOf(IOException.class);
    }

    @Test
    void switchingFromLiveToMock_swapsBack() throws Exception {
        factory.activate(cfg(false));

        factory.modified(cfg(true));

        assertThat(factory.callLoanApi("PBPERSO", 15000L, 48L, null, null)).isPresent();
    }

    /**
     * Mode inchangé : pas de swap. Les nouvelles URL, clés et timeouts sont déjà appliqués par
     * {@code ApimService} et lus en direct par le delegate — le recréer ne servirait à rien.
     */
    @Test
    void sameMode_keepsServingWithoutRebinding() throws Exception {
        factory.activate(cfg(true));

        factory.modified(cfg(true));

        assertThat(factory.callLoanApi("PBPERSO", 15000L, 48L, null, null)).isPresent();
    }

    /** {@code @Modified} avant {@code @Activate} : l'ordre des callbacks DS n'est pas garanti. */
    @Test
    void modifiedWithoutPriorActivate_stillBinds() throws Exception {
        factory.modified(cfg(true));

        assertThat(factory.callLoanApi("PBPERSO", 15000L, 48L, null, null)).isPresent();
    }

    // ------------------------------------------------------------------ désactivation

    /**
     * Après {@code @Deactivate}, un appel tardif doit échouer explicitement plutôt que par un
     * {@code NullPointerException} — le message nomme la cause dans le journal.
     */
    @Test
    void callAfterDeactivate_failsExplicitly() {
        factory.activate(cfg(true));
        factory.deactivate();

        assertThatThrownBy(() -> factory.callLoanApi("PBPERSO", 15000L, 48L, null, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("désactivé");

        assertThatThrownBy(() -> factory.callRevolvingApi("RESERVE", 3000L, 36L, null))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void deactivateIsIdempotent() {
        factory.activate(cfg(true));

        assertThatCode(() -> {
            factory.deactivate();
            factory.deactivate();
        }).doesNotThrowAnyException();
    }

    /** Réactivation après arrêt : le composant redevient utilisable. */
    @Test
    void reactivateAfterDeactivate_restoresTheDelegate() throws Exception {
        factory.activate(cfg(true));
        factory.deactivate();

        factory.activate(cfg(true));

        assertThat(factory.callLoanApi("PBPERSO", 15000L, 48L, null, null)).isPresent();
    }

    // ------------------------------------------------------------------ helper

    /** Fixture partagée — cf. {@link ApimConfigFixtures} pour le choix du mock et des délais. */
    private static ApimConfig cfg(boolean mockMode) {
        return ApimConfigFixtures.builder()
                .apiUrl("https://rct-api.sofinco.fr")
                .clientKey("a2V5")
                .origin("https://www.sofinco.fr")
                .mockMode(mockMode)
                .build();
    }
}
