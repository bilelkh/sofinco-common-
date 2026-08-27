package ch.sofinco.core.service;

import ch.sofinco.core.client.http.ApimHeaders;
import ch.sofinco.core.config.ApimConfig;
import ch.sofinco.core.exception.ApimException;
import ch.sofinco.core.model.apim.CachedToken;
import ch.sofinco.core.model.apim.TokenResponse;
import ch.sofinco.core.util.JsonFacade;
import ch.sofinco.core.util.LogSanitizer;
import ch.sofinco.core.util.SecurityChecks;
import org.apache.commons.lang3.StringUtils;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.core5.http.ClassicHttpResponse;
import org.apache.hc.core5.http.ContentType;
import org.apache.hc.core5.http.HttpStatus;
import org.apache.hc.core5.http.ParseException;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Jeton OAuth2 {@code client_credentials} de l'APIM, obtenu et mis en cache.
 *
 * <p>Séparé de {@code ApimServiceImpl} : celui-ci gère un cycle de vie OSGi, une configuration et
 * un client HTTP ; négocier un jeton et borner sa durée de validité est un sujet à part.
 *
 * <p><b>Concurrence.</b> Le rafraîchissement tient {@link #lock} pendant tout l'appel réseau, pour
 * empêcher un <i>token stampede</i> — sans quoi N threads arrivant sur un jeton expiré
 * demanderaient N jetons. La lecture rapide se fait hors verrou sur le champ volatile.
 *
 * <p>La reconfiguration doit passer par {@link #reconfigure(Runnable)} et non par un simple
 * {@link #invalidate()} suivi du changement : le jeton doit être invalidé et la nouvelle
 * configuration appliquée <b>sous le même verrou</b>, sinon un rafraîchissement en vol pourrait
 * mémoriser un jeton obtenu avec l'ancienne configuration après l'invalidation.
 */
final class ApimTokenStore {

    private static final Logger LOG = LoggerFactory.getLogger(ApimTokenStore.class);

    private static final String TOKEN_ENDPOINT = "/token";
    private static final String GRANT_TYPE_BODY = "grant_type=client_credentials";
    static final String MOCK_TOKEN = "mock-access-token-00000000-0000-0000-0000-000000000000";

    /** Plancher absolu pour {@code expires_in}. Visible package pour tests. */
    static final long MIN_REASONABLE_EXPIRES_IN_SECONDS = 60L;

    /** Seuil au-delà duquel un {@code expires_in} est une sentinelle WSO2 « never expire ». */
    static final long ABSURD_EXPIRES_IN_THRESHOLD_SECONDS = 86400L;

    private final Object lock = new Object();

    private final AtomicReference<CachedToken> cachedToken = new AtomicReference<>();

    /** Applique un changement de configuration en invalidant le jeton sous le MÊME verrou. */
    void reconfigure(Runnable configChange) {
        synchronized (lock) {
            this.cachedToken.set(null);
            configChange.run();
        }
    }

    void invalidate() {
        synchronized (lock) {
            if (cachedToken.getAndSet(null) != null) {
                LOG.debug("Cache token invalidé manuellement");
            }
        }
    }

    String getAccessToken(ApimConfig cfg, CloseableHttpClient client) throws ApimException {
        if (cfg == null) {
            throw new ApimException("ApimService non activé (config null)");
        }
        if (cfg.mockMode()) {
            return MOCK_TOKEN;
        }
        if (!ApimConfigs.hasMandatoryFields(cfg)) {
            throw new ApimException("Configuration APIM incomplète");
        }

        CachedToken snapshot = this.cachedToken.get();
        if (snapshot != null && snapshot.isStillValid(Instant.now())) {
            return snapshot.accessToken();
        }
        synchronized (lock) {
            snapshot = this.cachedToken.get();
            if (snapshot != null && snapshot.isStillValid(Instant.now())) {
                return snapshot.accessToken();
            }
            TokenResponse fresh = requestNewToken(cfg, client);
            long sanitizedExpiresIn = sanitizeExpiresIn(fresh.expiresIn(), cfg.tokenMaxCacheSeconds());
            this.cachedToken.set(CachedToken.from(
                    fresh.accessToken(), Instant.now(),
                    sanitizedExpiresIn, cfg.tokenSafetyMarginSeconds()));
            LOG.info("Nouveau token APIM obtenu : expires_in_brut={}s, mis_en_cache_pour={}s",
                    fresh.expiresIn(), sanitizedExpiresIn);
            return fresh.accessToken();
        }
    }

    /**
     * Borne {@code expires_in} dans {@code [MIN_REASONABLE, max(maxCacheSeconds, MIN_REASONABLE)]}
     * pour éviter (a) la sentinelle WSO2 {@code Long.MAX_VALUE/1000} et (b) un plafond/plancher
     * incohérent si {@code maxCacheSeconds} est mal configuré. Visible package pour tests.
     */
    static long sanitizeExpiresIn(long rawExpiresIn, int maxCacheSeconds) {
        long effectiveMax = Math.max(maxCacheSeconds, MIN_REASONABLE_EXPIRES_IN_SECONDS);
        if (maxCacheSeconds < MIN_REASONABLE_EXPIRES_IN_SECONDS) {
            LOG.warn("tokenMaxCacheSeconds={}s sous plancher {}s — plafond effectif relevé à {}s.",
                    maxCacheSeconds, MIN_REASONABLE_EXPIRES_IN_SECONDS, effectiveMax);
        }
        if (rawExpiresIn > effectiveMax) {
            if (rawExpiresIn > ABSURD_EXPIRES_IN_THRESHOLD_SECONDS) {
                LOG.warn("APIM /token expires_in={}s anormalement élevé. Plafonné à {}s.", rawExpiresIn, effectiveMax);
            } else {
                LOG.info("APIM /token expires_in={}s > plafond, plafonné à {}s.", rawExpiresIn, effectiveMax);
            }
            return effectiveMax;
        }
        if (rawExpiresIn < MIN_REASONABLE_EXPIRES_IN_SECONDS) {
            LOG.warn("APIM /token expires_in={}s anormalement bas. Forçage à {}s.",
                    rawExpiresIn, MIN_REASONABLE_EXPIRES_IN_SECONDS);
            return MIN_REASONABLE_EXPIRES_IN_SECONDS;
        }
        return rawExpiresIn;
    }

    /**
     * Demande un nouveau token Bearer à l'APIM. Depuis juin 2026, l'endpoint {@code /token} est
     * exposé sur la MÊME URL racine que les endpoints métier ({@link ApimConfig#apimApiUrl()}) —
     * confirmé par le support Sofinco. Fail-closed : refuse d'envoyer le Basic auth si
     * {@code apimApiUrl} est en HTTP non-loopback.
     */
    private TokenResponse requestNewToken(ApimConfig cfg, CloseableHttpClient client) throws ApimException {
        // Strip défensif des espaces (cf. ApimConfigs.cleanConfigString) — protège contre les
        // valeurs d'environnement Docker arrivant avec des CR/LF, trailing space ou NBSP.
        var apiUrlClean = ApimConfigs.cleanConfigString(cfg.apimApiUrl());
        var clientKeyClean = ApimConfigs.cleanConfigString(cfg.apimClientKey());

        if (SecurityChecks.isInsecureHttpNonLocal(apiUrlClean)) {
            throw new ApimException("Refus d'envoyer Basic auth en clair via HTTP non-local : "
                  + apiUrlClean + ". Configurer apimApiUrl en HTTPS.");
        }

        String tokenUrl = StringUtils.removeEnd(apiUrlClean, "/") + TOKEN_ENDPOINT;
        var correlationId = UUID.randomUUID().toString();

        if (client == null) {
            throw new ApimException("HttpClient partagé non initialisé");
        }

        var post = new HttpPost(tokenUrl);
        post.addHeader(ApimHeaders.AUTHORIZATION, ApimHeaders.BASIC_PREFIX + clientKeyClean);
        post.addHeader(ApimHeaders.CONTENT_TYPE, ApimHeaders.CONTENT_TYPE_FORM);
        post.addHeader(ApimHeaders.ACCEPT, ApimHeaders.ACCEPT_JSON);
        post.addHeader(ApimHeaders.CORRELATION_ID, correlationId);
        post.setEntity(new StringEntity(GRANT_TYPE_BODY, ContentType.APPLICATION_FORM_URLENCODED));

        try {
            return client.execute(post, response -> {
                int code = response.getCode();
                String body = readBodyUtf8(response);
                if (code != HttpStatus.SC_OK) {
                    LOG.error("POST {} → HTTP {}. Correlationid={}. Body: {}",
                            tokenUrl, code, correlationId, LogSanitizer.safeLog(body, 500));
                    throw new IOException("APIM /token HTTP " + code + " (correlationId=" + correlationId + ")");
                }
                TokenResponse parsed = JsonFacade.readValue(body, TokenResponse.class);
                if (StringUtils.isBlank(parsed.accessToken())) {
                    throw new IOException("APIM /token retour 200 mais access_token vide");
                }
                return parsed;
            });
        } catch (IOException e) {
            throw new ApimException("Echec obtention token APIM via " + tokenUrl, e);
        }
    }

    /** Lit le body en UTF-8 explicite (pas de fallback ISO-8859-1) ; encapsule ParseException en IOException. */
    private static String readBodyUtf8(ClassicHttpResponse response) throws IOException {
        if (response.getEntity() == null) {
            return "";
        }
        try {
            return EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
        } catch (ParseException e) {
            throw new IOException("Réponse APIM /token illisible (entity non parsable)", e);
        }
    }
}
