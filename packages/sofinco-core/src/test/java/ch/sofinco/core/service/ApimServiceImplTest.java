package ch.sofinco.core.service;

import ch.sofinco.core.config.ApimConfig;
import ch.sofinco.core.config.ApimConfigFixtures;
import ch.sofinco.core.exception.ApimException;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

/**
 * Tests d'{@link ApimServiceImpl} adaptés à la nouvelle architecture (HttpClient5 unique partagé,
 * appel /token inliné). Les helpers statiques restent les principaux points de vérité testables.
 * Les scénarios HTTP end-to-end (cache token, retry 401) relèvent d'un test d'intégration séparé
 * avec un serveur HTTP simulé (sprint S4).
 */
class ApimServiceImplTest {

    // ----------------------------------------------------------------- sanitizeExpiresIn (statique)

    @Test
    void sanitizeExpiresIn_floorCeilAndPassthrough() {
        assertThat(ApimTokenStore.sanitizeExpiresIn(3000, 3600)).isEqualTo(3000);   // dans l'intervalle
        assertThat(ApimTokenStore.sanitizeExpiresIn(5000, 3600)).isEqualTo(3600);   // plafonné
        assertThat(ApimTokenStore.sanitizeExpiresIn(100000, 3600)).isEqualTo(3600); // plafonné + warn absurde
        assertThat(ApimTokenStore.sanitizeExpiresIn(30, 3600)).isEqualTo(60);       // planché
    }

    @Test
    void sanitizeExpiresIn_raisesCeilWhenMaxBelowFloor() {
        // P1.6 : maxCacheSeconds mal posé sous le plancher → on remonte le plafond effectif au plancher
        // (au lieu d'avoir un plafond < plancher = incohérent).
        long out = ApimTokenStore.sanitizeExpiresIn(45, 30);
        assertThat(out).isEqualTo(60); // remonté à MIN_REASONABLE
    }

    // ----------------------------------------------------------------- mode mock

    @Test
    void getAccessToken_returnsMockTokenInMockMode() throws Exception {
        ApimServiceImpl svc = new ApimServiceImpl(configMock(), null);
        assertThat(svc.getAccessToken()).startsWith("mock-access-token-");
        assertThat(svc.isMockMode()).isTrue();
        assertThat(svc.isConfigured()).isFalse();
        assertThat(svc.isReady()).isTrue();
    }

    // ----------------------------------------------------------------- configuration

    @Test
    void isConfigured_falseWhenMandatoryFieldsMissing() {
        ApimServiceImpl svc = new ApimServiceImpl(configIncomplete(), mock(CloseableHttpClient.class));
        assertThat(svc.isConfigured()).isFalse();
        assertThat(svc.isReady()).isFalse(); // ni mock ni configuré
    }

    @Test
    void isConfigured_trueWhenAllMandatoryFieldsPresent() {
        ApimServiceImpl svc = new ApimServiceImpl(configComplete(), mock(CloseableHttpClient.class));
        assertThat(svc.isConfigured()).isTrue();
        assertThat(svc.isReady()).isTrue();
    }

    @Test
    void getAccessToken_throwsWhenNoConfig() {
        ApimServiceImpl svc = new ApimServiceImpl(null, null);
        assertThatThrownBy(svc::getAccessToken).isInstanceOf(ApimException.class);
    }

    @Test
    void getAccessToken_throwsWhenConfigIncomplete() {
        ApimServiceImpl svc = new ApimServiceImpl(configIncomplete(), mock(CloseableHttpClient.class));
        assertThatThrownBy(svc::getAccessToken)
                .isInstanceOf(ApimException.class)
                .hasMessageContaining("incomplète");
    }

    // ----------------------------------------------------------------- fail-closed HTTPS

    @Test
    void getAccessToken_refusesNonHttpsNonLoopbackApiUrl() {
        // Avec l'URL unifiée, c'est apimApiUrl qui est validée pour le /token.
        ApimServiceImpl svc = new ApimServiceImpl(
                configWithUrls("http://prod-apim.cacf.local", "key"),
                mock(CloseableHttpClient.class));
        assertThatThrownBy(svc::getAccessToken)
                .isInstanceOf(ApimException.class)
                .hasMessageContaining("HTTP non-local");
    }

    @Test
    void getAccessToken_throwsWhenHttpClientNotInitialized() {
        ApimServiceImpl svc = new ApimServiceImpl(configComplete(), null);
        assertThatThrownBy(svc::getAccessToken)
                .isInstanceOf(ApimException.class)
                .hasMessageContaining("HttpClient");
    }

    // ----------------------------------------------------------------- getters basiques

    @Test
    void gettersExposeConfigValuesOrDefaults() {
        ApimServiceImpl svc = new ApimServiceImpl(configComplete(), mock(CloseableHttpClient.class));
        assertThat(svc.getPartnerId()).isEqualTo("web_sofinco");
        assertThat(svc.getApiUrl()).isEqualTo("https://rct-api.sofinco.fr");
        assertThat(svc.getOrigin()).isEqualTo("https://www.sofinco.fr");
        assertThat(svc.getConnectTimeoutSeconds()).isEqualTo(5);
        assertThat(svc.getSocketTimeoutSeconds()).isEqualTo(10);
        assertThat(svc.getResponseTimeoutSeconds()).isEqualTo(15);
    }

    @Test
    void gettersFallbackWhenConfigNull() {
        ApimServiceImpl svc = new ApimServiceImpl(null, null);
        assertThat(svc.getPartnerId()).isEqualTo("web_sofinco");
        assertThat(svc.getApiUrl()).isEmpty();
        assertThat(svc.getOrigin()).isEmpty();
        assertThat(svc.getConnectTimeoutSeconds()).isEqualTo(5);
    }

    @Test
    void invalidateCache_idempotent() {
        ApimServiceImpl svc = new ApimServiceImpl(configComplete(), mock(CloseableHttpClient.class));
        assertThatCode(() -> {
            svc.invalidateCache();
            svc.invalidateCache(); // idempotent
        }).doesNotThrowAnyException();
    }

    // ----------------------------------------------------------------- fixtures

    private static ApimConfig configComplete() {
        // URL unifiée : /token et endpoints métier sur la même racine (validé Sofinco juin 2026).
        return configWithUrls("https://rct-api.sofinco.fr",
                              "Y29uc3VtZXJfa2V5OnNlY3JldA==");
    }

    private static ApimConfig configIncomplete() {
        // apimApiUrl vide → hasMandatoryFields false.
        return configWithUrls("", "key");
    }

    private static ApimConfig configMock() {
        return ApimConfigFixtures.builder().mockMode(true).build();
    }

    private static ApimConfig configWithUrls(String apiUrl, String clientKey) {
        return ApimConfigFixtures.builder()
                .apiUrl(apiUrl).clientKey(clientKey)
                .origin("https://www.sofinco.fr")
                .build();
    }
}
