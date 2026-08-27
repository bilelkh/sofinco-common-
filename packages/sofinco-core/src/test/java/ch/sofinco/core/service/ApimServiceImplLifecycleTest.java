package ch.sofinco.core.service;

import ch.sofinco.core.config.ApimConfig;
import ch.sofinco.core.config.ApimConfigFixtures;
import ch.sofinco.core.exception.ApimException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Cycle de vie DS et accesseurs, depuis l'extraction d'{@code ApimTokenStore} et
 * d'{@code ApimConfigs} : la classe ne garde que la configuration et le client HTTP partagé.
 */
class ApimServiceImplLifecycleTest {

    // ------------------------------------------------------------------ activation

    @Test
    void activate_appliesConfigAndBuildsTheSharedClient() {
        ApimServiceImpl service = new ApimServiceImpl();
        service.activate(cfg("https://rct-api.sofinco.fr", "a2V5", false));

        assertThat(service.isConfigured()).isTrue();
        assertThat(service.isMockMode()).isFalse();
        assertThat(service.getHttpClient()).isNotNull();
        assertThat(service.getApiUrl()).isEqualTo("https://rct-api.sofinco.fr");

        service.deactivate();
    }

    /** Configuration incomplète : le service s'active quand même, en se déclarant non configuré. */
    @Test
    void activate_withIncompleteConfig_staysUnconfiguredWithoutThrowing() {
        ApimServiceImpl service = new ApimServiceImpl();

        assertThatCode(() -> service.activate(cfg("", "", false))).doesNotThrowAnyException();
        assertThat(service.isConfigured()).isFalse();

        service.deactivate();
    }

    /** Reconfiguration à chaud : nouvelles valeurs appliquées, client HTTP recréé. */
    @Test
    void modified_replacesConfigAndClient() {
        ApimServiceImpl service = new ApimServiceImpl();
        service.activate(cfg("https://rct-api.sofinco.fr", "k1", false));
        Object first = service.getHttpClient();

        service.modified(cfg("https://api.sofinco.fr", "k2", false));

        assertThat(service.getApiUrl()).isEqualTo("https://api.sofinco.fr");
        assertThat(service.getHttpClient()).isNotNull().isNotSameAs(first);

        service.deactivate();
    }

    @Test
    void deactivate_dropsConfigAndClient() {
        ApimServiceImpl service = new ApimServiceImpl();
        service.activate(cfg("https://rct-api.sofinco.fr", "k", false));

        service.deactivate();

        assertThat(service.isConfigured()).isFalse();
        assertThat(service.getHttpClient()).isNull();
    }

    /** Double désactivation (arrêt puis rechargement du bundle) : idempotente. */
    @Test
    void deactivate_isIdempotent() {
        ApimServiceImpl service = new ApimServiceImpl();
        service.activate(cfg("https://rct-api.sofinco.fr", "k", false));

        assertThatCode(() -> {
            service.deactivate();
            service.deactivate();
        }).doesNotThrowAnyException();
    }

    // ------------------------------------------------------------------ accesseurs hors activation

    /**
     * Avant activation, aucun accesseur ne doit lever : DS publie le service après
     * {@code activate}, mais un appel prématuré ne doit pas casser le rendu d'une page.
     */
    @Test
    void gettersBeforeActivation_returnSafeDefaults() {
        ApimServiceImpl service = new ApimServiceImpl();

        assertThat(service.isConfigured()).isFalse();
        assertThat(service.isMockMode()).isFalse();
        assertThat(service.getHttpClient()).isNull();
        assertThat(service.getApiUrl()).isEmpty();
        assertThat(service.getOrigin()).isEmpty();
        assertThat(service.getPartnerId()).isEqualTo("web_sofinco");
        assertThat(service.getConnectTimeoutSeconds()).isEqualTo(5);
        assertThat(service.getSocketTimeoutSeconds()).isEqualTo(10);
        assertThat(service.getResponseTimeoutSeconds()).isEqualTo(15);
    }

    @Test
    void accessTokenBeforeActivation_isRejected() {
        assertThatThrownBy(() -> new ApimServiceImpl().getAccessToken())
                .isInstanceOf(ApimException.class)
                .hasMessageContaining("non activé");
    }

    /** Le jeton mock est servi sans le moindre appel réseau. */
    @Test
    void mockMode_servesAStableTokenWithoutHttp() throws Exception {
        ApimServiceImpl service = new ApimServiceImpl();
        service.activate(cfg("https://rct-api.sofinco.fr", "k", true));

        assertThat(service.isMockMode()).isTrue();
        assertThat(service.getAccessToken()).isEqualTo(ApimTokenStore.MOCK_TOKEN);

        service.deactivate();
    }

    /** L'URL est nettoyée et son `/` final retiré : la concaténation en aval doit être sûre. */
    @Test
    void getApiUrl_isTrimmedAndHasNoTrailingSlash() {
        ApimServiceImpl service = new ApimServiceImpl();
        service.activate(cfg("  https://api.sofinco.fr/  ", "k", false));

        assertThat(service.getApiUrl()).isEqualTo("https://api.sofinco.fr");

        service.deactivate();
    }

    /** Un partnerId vide retombe sur le défaut plutôt que d'émettre un en-tête vide. */
    @Test
    void blankPartnerId_fallsBackToTheDefault() {
        ApimConfig config = cfg("https://api.sofinco.fr", "k", false);
        when(config.partnerId()).thenReturn("   ");

        ApimServiceImpl service = new ApimServiceImpl();
        service.activate(config);

        assertThat(service.getPartnerId()).isEqualTo("web_sofinco");

        service.deactivate();
    }

    // ------------------------------------------------------------------ helper

    /** Fixture partagée — cf. {@link ApimConfigFixtures} pour le choix du mock et des délais. */
    private static ApimConfig cfg(String apiUrl, String clientKey, boolean mockMode) {
        return ApimConfigFixtures.builder()
                .apiUrl(apiUrl).clientKey(clientKey).mockMode(mockMode)
                .build();
    }
}
