package ch.sofinco.core.client.http;

import ch.sofinco.core.exception.ApimException;
import ch.sofinco.core.service.ApimService;
import ch.sofinco.core.util.LogSanitizer;
import ch.sofinco.core.util.SecurityChecks;
import org.apache.commons.lang3.StringUtils;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.classic.methods.HttpUriRequestBase;
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
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.UnaryOperator;

/**
 * Executor HTTP centralisé pour tous les appels APIM Sofinco. Encapsule l'injection
 * Bearer, le retry-on-401, et le fail-closed HTTPS. Stateless, thread-safe.
 *
 * <p>Toute réponse 2xx est succès. Retourne un {@link ApiResult} typé (jamais null) :
 * le caller peut discriminer succès / 4xx / 5xx / 401 sans logique sur null.
 *
 * <p>Les headers réservés ({@link ApimHeaders#AUTHORIZATION}, {@link ApimHeaders#CONTEXT_APP},
 * {@link ApimHeaders#CORRELATION_ID}) sont gérés en interne — un caller ne peut pas les écraser
 * via {@code extraHeaders} (HttpClient 5 autorise plusieurs valeurs pour le même nom,
 * comportement WSO2 imprévisible sinon).
 */
public class ApimHttpExecutor {

    private static final Logger LOG = LoggerFactory.getLogger(ApimHttpExecutor.class);

    private static final String METHOD_POST = "POST";
    private static final String METHOD_GET = "GET";
    private static final int HTTP_SUCCESS_UPPER_EXCLUSIVE = 300;

    /** Headers gérés exclusivement par cet executor (lowercase, RFC 7230 case-insensitive). */
    private static final Set<String> RESERVED_HEADERS = Set.of(
            ApimHeaders.AUTHORIZATION.toLowerCase(Locale.ROOT),
            ApimHeaders.CONTEXT_APP.toLowerCase(Locale.ROOT),
            ApimHeaders.CORRELATION_ID.toLowerCase(Locale.ROOT));

    private final ApimService apimService;

    public ApimHttpExecutor(ApimService apimService) {
        this.apimService = apimService;
    }

    /** POST avec body JSON et retry automatique sur 401. */
    public ApiResult post(String url, String jsonBody, String effectiveOrigin,
                          UnaryOperator<String> errorParser)
            throws ApimException, IOException {
        return execute(url, METHOD_POST, jsonBody, effectiveOrigin, Collections.emptyMap(), errorParser);
    }

    /**
     * GET sans body, avec le même retry automatique sur 401.
     *
     * <p>Traverse exactement le même chemin que {@link #post} : mêmes en-têtes, même contrôle
     * fail-closed sur HTTP non-local, même invalidation du jeton puis nouvelle tentative. Les
     * ressources en lecture seule de l'APIM — la campagne d'une provenance — n'ont aucune raison
     * d'avoir leur propre politique d'authentification.
     */
    public ApiResult get(String url, String effectiveOrigin, UnaryOperator<String> errorParser)
            throws ApimException, IOException {
        return get(url, effectiveOrigin, errorParser, IntPredicate.NONE_EXPECTED);
    }

    /**
     * Variante déclarant les codes d'erreur ATTENDUS de cet endpoint.
     *
     * <p>Un code attendu reste une erreur HTTP — il produit le même {@link ApiResult} — mais il
     * se journalise en {@code DEBUG} au lieu d'{@code ERROR}.
     *
     * <p>Le besoin vient de l'endpoint {@code campaigns}, qui répond {@code HTTP 500} pour une
     * provenance inexistante. Sans cette distinction, chaque code de campagne mal saisi par un
     * contributeur écrivait dans le journal d'ERREURS — donc dans le journal même où une vraie
     * panne APIM doit ressortir. Une saisie erronée n'est pas un incident de service.
     */
    public ApiResult get(String url, String effectiveOrigin, UnaryOperator<String> errorParser,
                         IntPredicate expectedError) throws ApimException, IOException {
        return execute(url, METHOD_GET, null, effectiveOrigin, Collections.emptyMap(),
                errorParser, expectedError);
    }

    /** Codes d'erreur qu'un appelant considère comme une réponse normale de son endpoint. */
    @FunctionalInterface
    public interface IntPredicate {

        /** Aucun code attendu — comportement historique : toute erreur se journalise en ERROR. */
        IntPredicate NONE_EXPECTED = httpCode -> false;

        boolean isExpected(int httpCode);
    }

    /**
     * Méthode générique extensible (GET/PUT/DELETE à ajouter via {@link #buildRequest}).
     * Fail-closed : refuse d'envoyer le Bearer si {@code url} est en HTTP non-loopback.
     */
    public ApiResult execute(String url, String method, String jsonBody, String effectiveOrigin,
                             Map<String, String> extraHeaders, UnaryOperator<String> errorParser)
            throws ApimException, IOException {
        return execute(url, method, jsonBody, effectiveOrigin, extraHeaders, errorParser,
                IntPredicate.NONE_EXPECTED);
    }

    /** Voir {@link #get(String, String, UnaryOperator, IntPredicate)} pour {@code expectedError}. */
    public ApiResult execute(String url, String method, String jsonBody, String effectiveOrigin,
                             Map<String, String> extraHeaders, UnaryOperator<String> errorParser,
                             IntPredicate expectedError)
            throws ApimException, IOException {

        if (SecurityChecks.isInsecureHttpNonLocal(url)) {
            throw new ApimException("Refus d'envoyer Bearer token en clair via HTTP non-local : " + url
                  + ". Configurer apimApiUrl en HTTPS.");
        }

        ApiCallResult r1 = doRequest(url, method, jsonBody, apimService.getAccessToken(),
                effectiveOrigin, extraHeaders);
        if (isSuccess(r1.httpCode)) {
            return toApiResult(r1);
        }
        if (r1.httpCode != HttpStatus.SC_UNAUTHORIZED) {
            logApiError(url, r1, errorParser, expectedError);
            return toApiResult(r1);
        }

        LOG.warn("APIM 401 sur {} — invalidation cache token + retry", url);
        apimService.invalidateCache();
        ApiCallResult r2 = doRequest(url, method, jsonBody, apimService.getAccessToken(),
                effectiveOrigin, extraHeaders);
        if (!isSuccess(r2.httpCode)) {
            logApiError(url, r2, errorParser, expectedError);
        }
        return toApiResult(r2);
    }

    private static boolean isSuccess(int httpCode) {
        return httpCode >= HttpStatus.SC_OK && httpCode < HTTP_SUCCESS_UPPER_EXCLUSIVE;
    }

    private static ApiResult toApiResult(ApiCallResult r) {
        return new ApiResult(r.httpCode, r.body, r.correlationId);
    }

    private ApiCallResult doRequest(String url, String method, String jsonBody,
                                    String bearerToken, String effectiveOrigin,
                                    Map<String, String> extraHeaders) throws IOException {
        var correlationId = UUID.randomUUID().toString();

        CloseableHttpClient client = apimService.getHttpClient();
        if (client == null) {
            throw new IOException("HttpClient partagé non disponible");
        }

        HttpUriRequestBase request = buildRequest(method, url);

        request.addHeader(ApimHeaders.AUTHORIZATION, ApimHeaders.BEARER_PREFIX + bearerToken);
        request.addHeader(ApimHeaders.CONTEXT_APP, ApimHeaders.CONTEXT_APP_VALUE);
        request.addHeader(ApimHeaders.CORRELATION_ID, correlationId);
        request.addHeader(ApimHeaders.ACCEPT, ApimHeaders.ACCEPT_VALUE);

        if (StringUtils.isNotBlank(effectiveOrigin)) {
            request.addHeader(ApimHeaders.ORIGIN, effectiveOrigin);
            request.addHeader(ApimHeaders.REFERER, StringUtils.removeEnd(effectiveOrigin, "/") + "/");
        }

        if (extraHeaders != null) {
            extraHeaders.forEach((name, value) -> {
                if (name == null) {
                    return;
                }
                if (RESERVED_HEADERS.contains(name.toLowerCase(Locale.ROOT))) {
                    LOG.warn("extraHeaders contient un header réservé ignoré : {}", name);
                    return;
                }
                request.addHeader(name, value);
            });
        }

        if (jsonBody != null && request instanceof HttpPost post) {
            request.addHeader(ApimHeaders.CONTENT_TYPE, ApimHeaders.CONTENT_TYPE_JSON);
            post.setEntity(new StringEntity(jsonBody, ContentType.APPLICATION_JSON));
        }

        return client.execute(request, response -> {
            int code = response.getCode();
            String body = readBodyUtf8(response);
            return new ApiCallResult(code, body, correlationId);
        });
    }

    /** Lit le body en UTF-8 explicite ; encapsule ParseException en IOException. */
    private static String readBodyUtf8(ClassicHttpResponse response) throws IOException {
        if (response.getEntity() == null) {
            return "";
        }
        try {
            return EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
        } catch (ParseException e) {
            throw new IOException("Réponse APIM illisible (entity non parsable)", e);
        }
    }

    private HttpUriRequestBase buildRequest(String method, String url) {
        var uri = URI.create(url);
        String upperMethod = method.toUpperCase(Locale.ROOT);
        if (METHOD_POST.equals(upperMethod)) {
            return new HttpPost(uri);
        }
        if (METHOD_GET.equals(upperMethod)) {
            return new HttpGet(uri);
        }
        throw new UnsupportedOperationException("Méthode HTTP non supportée : " + method);
    }

    private void logApiError(String url, ApiCallResult r, UnaryOperator<String> errorParser,
                             IntPredicate expectedError) {
        if (expectedError.isExpected(r.httpCode)) {
            // Réponse normale de cet endpoint : on trace pour le diagnostic, sans polluer le
            // journal d'erreurs où se lisent les pannes réelles.
            LOG.debug("REQUEST {} → HTTP {} (attendu pour cet endpoint). Correlationid={}",
                    url, r.httpCode, r.correlationId);
            return;
        }
        String parsedSummary = null;
        if (errorParser != null) {
            try {
                parsedSummary = errorParser.apply(r.body);
            } catch (RuntimeException e) {
                // L'analyseur ne sert qu'à enrichir CE log. Le laisser remonter remplacerait
                // l'ApiResult attendu par une exception d'un type inattendu, et masquerait la
                // panne APIM réelle derrière un défaut de diagnostic. On retombe sur le corps brut.
                LOG.debug("Analyse du corps d'erreur APIM impossible : {}", e.getMessage());
            }
        }
        if (StringUtils.isNotBlank(parsedSummary)) {
            LOG.error("REQUEST {} → HTTP {} ({}). Correlationid={}",
                    url, r.httpCode, parsedSummary, r.correlationId);
        } else if (LOG.isErrorEnabled()) {
            LOG.error("REQUEST {} → HTTP {}. Correlationid={}. Body: {}",
                    url, r.httpCode, r.correlationId, LogSanitizer.safeLog(r.body, 300));
        }
    }

    /** Container immuable interne. Package-private pour tests. */
    static final class ApiCallResult {
        final int httpCode;
        final String body;
        final String correlationId;
        ApiCallResult(int httpCode, String body, String correlationId) {
            this.httpCode = httpCode;
            this.body = body;
            this.correlationId = correlationId;
        }
    }
}
