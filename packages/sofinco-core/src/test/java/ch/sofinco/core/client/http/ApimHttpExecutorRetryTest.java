package ch.sofinco.core.client.http;

import ch.sofinco.core.exception.ApimException;
import ch.sofinco.core.service.ApimService;
import org.apache.hc.client5.http.classic.methods.HttpUriRequestBase;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.core5.http.io.HttpClientResponseHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.UnaryOperator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Chemins d'erreur et de rejeu de {@link ApimHttpExecutor}.
 *
 * <p>{@code ApimHttpExecutorHeadersTest} couvre les en-têtes du cas nominal ; ce fichier traite
 * ce qui se passe quand l'APIM répond mal — c'est-à-dire l'essentiel de la valeur de cette classe
 * sur une API bancaire.
 */
class ApimHttpExecutorRetryTest {

    private ApimService apim;
    private CloseableHttpClient http;
    private ApimHttpExecutor executor;

    @BeforeEach
    void setUp() throws Exception {
        apim = mock(ApimService.class);
        http = mock(CloseableHttpClient.class);
        when(apim.getHttpClient()).thenReturn(http);
        when(apim.getAccessToken()).thenReturn("token-1");
        executor = new ApimHttpExecutor(apim);
    }

    // ------------------------------------------------------------------ fail-closed

    /**
     * Le garde-fou qui compte : plutôt que d'émettre un Bearer en clair sur HTTP non-loopback, on
     * refuse l'appel. Une URL mal configurée ne doit jamais exposer un jeton.
     */
    @Test
    void insecureHttpUrl_refusesBeforeSendingTheBearer() throws Exception {
        assertThatThrownBy(() -> executor.post("http://api.sofinco.fr/v3", "{}", null, noParser()))
                .isInstanceOf(ApimException.class)
                .hasMessageContaining("HTTP non-local");

        verify(http, never()).execute(any(HttpUriRequestBase.class), anyHandler());
        verify(apim, never()).getAccessToken();
    }

    @Test
    void httpOnLoopback_isAccepted() throws Exception {
        respondWith(200, "{\"ok\":true}");

        assertThat(executor.post("http://localhost:8080/v3", "{}", null, noParser()).isSuccess())
                .isTrue();
    }

    // ------------------------------------------------------------------ rejeu sur 401

    /**
     * Un 401 signifie un jeton périmé côté APIM alors que notre cache le croit valide. On invalide
     * et on rejoue UNE fois — sans quoi la page resterait en erreur jusqu'à l'expiration naturelle.
     */
    @Test
    void unauthorized_invalidatesTheTokenAndRetriesOnce() throws Exception {
        respondWithSequence(200);

        ApiResult result = executor.post("https://api.sofinco.fr/v3", "{}", null, noParser());

        assertThat(result.isSuccess()).isTrue();
        verify(apim).invalidateCache();
        verify(apim, times(2)).getAccessToken();   // jeton d'origine, puis jeton frais
        verify(http, times(2)).execute(any(HttpUriRequestBase.class), anyHandler());
    }

    /** Le rejeu n'est pas rejoué : deux 401 d'affilée remontent l'échec plutôt que de boucler. */
    @Test
    void unauthorizedTwice_returnsTheFailureWithoutLooping() throws Exception {
        respondWithSequence(401);

        ApiResult result = executor.post("https://api.sofinco.fr/v3", "{}", null, noParser());

        assertThat(result.isAuthFailure()).isTrue();
        verify(http, times(2)).execute(any(HttpUriRequestBase.class), anyHandler());
    }

    // ------------------------------------------------------------------ autres erreurs

    /** Une erreur non-401 n'est jamais rejouée : rien ne dit qu'elle serait transitoire. */
    @Test
    void serverError_isReturnedWithoutRetry() throws Exception {
        respondWith(500, "{\"error\":\"boom\"}");

        ApiResult result = executor.post("https://api.sofinco.fr/v3", "{}", null, noParser());

        assertThat(result.isServerError()).isTrue();
        assertThat(result.hasBody()).isTrue();
        verify(apim, never()).invalidateCache();
        verify(http, times(1)).execute(any(HttpUriRequestBase.class), anyHandler());
    }

    /** L'analyseur d'erreur enrichit le journal ; une exception de sa part ne doit rien casser. */
    @Test
    void aThrowingErrorParser_doesNotBreakTheResult() throws Exception {
        respondWith(400, "{\"code\":\"E1\"}");

        ApiResult result = executor.post("https://api.sofinco.fr/v3", "{}", null,
                body -> { throw new IllegalStateException("analyseur cassé"); });

        assertThat(result.isClientError()).isTrue();
    }

    @Test
    void aBlankParsedSummary_isTolerated() throws Exception {
        respondWith(422, "{}");

        assertThat(executor.post("https://api.sofinco.fr/v3", "{}", null, body -> "  ")
                .isClientError()).isTrue();
    }

    // ------------------------------------------------------------------ client indisponible

    /** Bundle en cours d'arrêt ou APIM reconfiguré : le client partagé peut manquer. */
    @Test
    void missingSharedClient_isReportedAsAnIoFailure() {
        when(apim.getHttpClient()).thenReturn(null);

        assertThatThrownBy(() -> executor.post("https://api.sofinco.fr/v3", "{}", null, noParser()))
                .isInstanceOf(IOException.class)
                .hasMessageContaining("HttpClient");
    }

    // ------------------------------------------------------------------ méthode non supportée

    @Test
    void unsupportedMethod_isRejectedExplicitly() {
        // `noParser()` hors du lambda : seul l'appel à `execute` doit pouvoir lever ici.
        UnaryOperator<String> parser = noParser();
        assertThatThrownBy(() -> executor.execute("https://api.sofinco.fr/v3", "DELETE", null,
                null, Collections.emptyMap(), parser))
                .isInstanceOf(UnsupportedOperationException.class)
                .hasMessageContaining("DELETE");
    }

    // ------------------------------------------------------------------ en-têtes additionnels

    /**
     * Un appelant ne doit pas pouvoir écraser Authorization, Content-Type ou Correlationid : ce
     * sont les en-têtes que l'exécuteur garantit. Une entrée nulle est ignorée sans lever.
     */
    @Test
    void reservedAndNullExtraHeaders_areIgnored() throws Exception {
        respondWith(200, "{}");

        Map<String, String> extras = new java.util.HashMap<>();
        extras.put(ApimHeaders.AUTHORIZATION, "Bearer usurpe");
        extras.put(null, "sans nom");
        extras.put("X-Sofinco-Trace", "conserve");

        assertThat(executor.execute("https://api.sofinco.fr/v3", "POST", "{}", "https://o",
                extras, noParser()).isSuccess()).isTrue();
    }

    // ------------------------------------------------------------------ helpers

    private static UnaryOperator<String> noParser() {
        return body -> null;
    }

    /** Matcher typé : `any(Class)` produirait un type brut et une conversion non vérifiée. */
    private static HttpClientResponseHandler<ApimHttpExecutor.ApiCallResult> anyHandler() {
        return any();
    }

    private void respondWith(int code, String body) throws Exception {
        when(http.execute(any(HttpUriRequestBase.class), anyHandler()))
                .thenAnswer(i -> new ApimHttpExecutor.ApiCallResult(code, body, "cid"));
    }

    /** Réponses successives : le premier appel obtient {@code first}, le rejeu {@code second}. */
    private void respondWithSequence(int second) throws Exception {
        AtomicInteger calls = new AtomicInteger();
        when(http.execute(any(HttpUriRequestBase.class), anyHandler())).thenAnswer(i ->
                new ApimHttpExecutor.ApiCallResult(
                        calls.incrementAndGet() == 1 ? 401 : second, "{}", "cid"));
    }
}
