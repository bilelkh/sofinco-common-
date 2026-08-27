package ch.sofinco.core.client.http;

import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Smoke tests pour {@link HttpClientFactory}. On ne lance pas de socket réelle — on vérifie que
 * le client se construit sans exception (TLS init OK), qu'il est utilisable, et qu'on rejette
 * les timeouts invalides en amont (anti-misconfiguration silencieuse).
 */
class HttpClientFactoryTest {

    @Test
    void build_returnsClosableClientWithDefaultTimeouts() throws Exception {
        try (CloseableHttpClient client = HttpClientFactory.build(5, 10, 15)) {
            assertThat(client).isNotNull();
        }
    }

    @Test
    void build_rejectsZeroTimeouts() {
        assertThatThrownBy(() -> HttpClientFactory.build(0, 10, 15))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Timeouts");
    }

    @Test
    void build_rejectsNegativeTimeouts() {
        assertThatThrownBy(() -> HttpClientFactory.build(5, -1, 15))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> HttpClientFactory.build(5, 10, -1))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
