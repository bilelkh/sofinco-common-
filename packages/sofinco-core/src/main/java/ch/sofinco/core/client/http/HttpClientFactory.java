package ch.sofinco.core.client.http;

import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.client5.http.ssl.DefaultClientTlsStrategy;
import org.apache.hc.core5.util.TimeValue;
import org.apache.hc.core5.util.Timeout;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.net.ssl.SSLContext;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;

/**
 * Factory unique pour les {@link CloseableHttpClient} du bundle.
 *
 * <p>Config : pool 20 max / 10 par route, redirections auto désactivées (APIM ne suit jamais),
 * retries auto désactivés (le retry métier 401 est géré côté {@link ApimHttpExecutor}).
 *
 * <p>Hygiène keep-alive (client long-vécu, retries auto OFF) : {@code validateAfterInactivity}
 * re-valide une connexion inactive avant réutilisation (détecte les sockets fermées côté APIM),
 * {@code timeToLive} recycle périodiquement, {@code evictExpired/Idle} ferment proactivement.
 *
 * <h2>TLS &amp; proxy explicites</h2>
 *
 * <p>Le {@link SSLContext} est résolu via {@link SSLContext#getDefault()} et le set de protocoles
 * activés est journalisé à l'init pour traçabilité ops (audit TLS). {@link DefaultClientTlsStrategy}
 * applique la vérification d'hostname stricte standard ({@code HttpsSupport.getDefaultHostnameVerifier()}).
 *
 * <p>Le routage proxy est piloté par {@code useSystemProperties()} : les variables d'environnement
 * Sofinco corporate ({@code -Dhttps.proxyHost}, {@code -Dhttp.nonProxyHosts}) sont honorées sans
 * code spécifique. Pas de DNS leak via le builder par défaut.
 *
 * <p>Stateless, thread-safe.
 */
public final class HttpClientFactory {

    private static final Logger LOG = LoggerFactory.getLogger(HttpClientFactory.class);

    private static final int DEFAULT_MAX_TOTAL_CONNECTIONS = 20;
    private static final int DEFAULT_MAX_PER_ROUTE = 10;

    /** Délai inactivité au-delà duquel une connexion est re-validée avant réutilisation. */
    private static final TimeValue VALIDATE_AFTER_INACTIVITY = TimeValue.ofSeconds(5);

    /** TTL dur d'une connexion keep-alive : recyclage périodique. */
    private static final TimeValue CONNECTION_TIME_TO_LIVE = TimeValue.ofMinutes(5);

    /** Seuil d'inactivité pour l'éviction proactive. */
    private static final TimeValue IDLE_CONNECTION_EVICTION = TimeValue.ofSeconds(30);

    private HttpClientFactory() {
        // factory statique
    }

    /**
     * Construit un client HTTP avec timeouts, pool, TLS explicite et support proxy système.
     *
     * @throws IllegalArgumentException si l'un des timeouts est nul ou négatif
     */
    public static CloseableHttpClient build(int connectTimeoutSeconds,
                                            int socketTimeoutSeconds,
                                            int responseTimeoutSeconds) {
        validateTimeouts(connectTimeoutSeconds, socketTimeoutSeconds, responseTimeoutSeconds);

        ConnectionConfig connConfig = ConnectionConfig.custom()
                .setConnectTimeout(Timeout.ofSeconds(connectTimeoutSeconds))
                .setSocketTimeout(Timeout.ofSeconds(socketTimeoutSeconds))
                .setValidateAfterInactivity(VALIDATE_AFTER_INACTIVITY)
                .setTimeToLive(CONNECTION_TIME_TO_LIVE)
                .build();

        PoolingHttpClientConnectionManager cm = PoolingHttpClientConnectionManagerBuilder.create()
                .setTlsSocketStrategy(buildTlsStrategy())
                .setDefaultConnectionConfig(connConfig)
                .setMaxConnTotal(DEFAULT_MAX_TOTAL_CONNECTIONS)
                .setMaxConnPerRoute(DEFAULT_MAX_PER_ROUTE)
                .build();

        RequestConfig reqConfig = RequestConfig.custom()
                .setResponseTimeout(Timeout.ofSeconds(responseTimeoutSeconds))
                .setConnectionRequestTimeout(Timeout.ofSeconds(connectTimeoutSeconds))
                .build();

        return HttpClients.custom()
                .setConnectionManager(cm)
                .setDefaultRequestConfig(reqConfig)
                // Honore -Dhttps.proxyHost / -Dhttp.proxyHost / -Dhttp.nonProxyHosts (proxy corporate Sofinco)
                .useSystemProperties()
                .disableRedirectHandling()
                .disableAutomaticRetries()
                .evictExpiredConnections()
                .evictIdleConnections(IDLE_CONNECTION_EVICTION)
                .build();
    }

    /**
     * Construit la stratégie TLS et journalise les protocoles activés pour audit ops.
     * Réutilise le {@link SSLContext#getDefault() SSLContext par défaut JVM} (qui résout le
     * truststore via {@code -Djavax.net.ssl.trustStore}, configurable par les ops Sofinco).
     */
    private static DefaultClientTlsStrategy buildTlsStrategy() {
        try {
            var sslContext = SSLContext.getDefault();
            String[] protocols = sslContext.getDefaultSSLParameters().getProtocols();
            LOG.info("APIM HttpClient TLS init — provider={}, defaultProtocols={}",
                    sslContext.getProvider().getName(),
                    protocols != null ? Arrays.asList(protocols) : "n/a");
            return new DefaultClientTlsStrategy(sslContext);
        } catch (NoSuchAlgorithmException e) {
            // Impossible sur une JVM standard — log + fallback factory default.
            LOG.warn("SSLContext.getDefault() indisponible, fallback DefaultClientTlsStrategy.createDefault()", e);
            return DefaultClientTlsStrategy.createDefault();
        }
    }

    private static void validateTimeouts(int connect, int socket, int response) {
        if (connect <= 0 || socket <= 0 || response <= 0) {
            throw new IllegalArgumentException(
                    "Timeouts doivent être > 0 (connect=" + connect
                            + ", socket=" + socket + ", response=" + response + ")");
        }
    }
}
