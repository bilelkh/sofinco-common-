package ch.sofinco.core.client.http;

import ch.sofinco.core.exception.ApimException;
import ch.sofinco.core.service.ApimService;
import org.apache.hc.client5.http.classic.methods.HttpUriRequestBase;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.core5.http.Header;
import org.apache.hc.core5.http.io.HttpClientResponseHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Verrouille le contrat headers de {@link ApimHttpExecutor} : Bearer Authorization, contextApp,
 * Correlationid (casing exact attendu par WSO2), Accept, Origin/Referer si fourni, et refus
 * d'écraser les headers réservés via {@code extraHeaders}. Verrouille aussi le fail-closed HTTPS.
 *
 * <p>Approche : on capture le {@link HttpUriRequestBase} envoyé au {@link CloseableHttpClient}
 * mocké via {@link ArgumentCaptor} et on inspecte ses headers.
 */
class ApimHttpExecutorHeadersTest {

    private CloseableHttpClient http;
    private ApimHttpExecutor executor;

    @BeforeEach
    void setUp() throws Exception {
        ApimService apim = mock(ApimService.class);
        http = mock(CloseableHttpClient.class);
        when(apim.getHttpClient()).thenReturn(http);
        when(apim.getAccessToken()).thenReturn("opaque-token-uuid");
        // Réponse 200 par défaut — on ne teste pas le path d'erreur ici.
        //
        // `any()` TYPÉ plutôt que `any(HttpClientResponseHandler.class)` : la variante à littéral
        // de classe produit un type BRUT, que le compilateur doit ensuite convertir sans
        // vérification vers `HttpClientResponseHandler<? extends T>`. Nommer le paramètre de type
        // supprime la cause au lieu d'annoter la conséquence.
        when(http.execute(any(HttpUriRequestBase.class), anyHandler()))
                .thenAnswer(inv -> new ApimHttpExecutor.ApiCallResult(200, "{}", "cid-x"));
        executor = new ApimHttpExecutor(apim);
    }

    /**
     * Le GET traverse EXACTEMENT le même chemin que le POST : mêmes en-têtes réservés, même
     * jeton, même contrôle fail-closed. Une ressource en lecture seule de l'APIM n'a aucune
     * raison d'avoir sa propre politique d'authentification.
     */
    @Test
    void get_buildsAGetRequestWithTheSameReservedHeaders() throws Exception {
        executor.get("https://api.sofinco.fr/revolvingSimulation/v3/partners/p/campaigns/NEOURL41",
                "https://www.sofinco.fr", null);

        HttpUriRequestBase req = captureRequest();

        assertThat(req.getMethod()).isEqualTo("GET");
        assertThat(headerMap(req))
                .containsEntry(ApimHeaders.AUTHORIZATION, ApimHeaders.BEARER_PREFIX + "opaque-token-uuid")
                .containsKey(ApimHeaders.CORRELATION_ID)
                .containsKey(ApimHeaders.CONTEXT_APP)
                .containsEntry(ApimHeaders.ORIGIN, "https://www.sofinco.fr");
    }

    /** Un GET n'emporte AUCUN corps, même si le chemin générique en accepte un. */
    @Test
    void get_carriesNoEntity() throws Exception {
        executor.get("https://api.sofinco.fr/x", null, null);

        assertThat(captureRequest().getEntity()).isNull();
    }

    @Test
    void post_setsReservedHeadersWithExpectedCasingAndValues() throws Exception {
        executor.post("https://api.sofinco.fr/loanSimulation/v3", "{\"k\":1}",
                "https://www.sofinco.fr", null);

        HttpUriRequestBase req = captureRequest();
        Map<String, String> headers = headerMap(req);

        // Correlationid : casing exact (WSO2 strict, ne pas remplacer par Correlation-Id).
        // Referer = Origin/ avec trailing slash idempotent.
        assertThat(headers)
                .containsEntry(ApimHeaders.AUTHORIZATION, ApimHeaders.BEARER_PREFIX + "opaque-token-uuid")
                .containsKey(ApimHeaders.CORRELATION_ID)
                .containsKey(ApimHeaders.CONTEXT_APP)
                .containsEntry(ApimHeaders.ACCEPT, ApimHeaders.ACCEPT_VALUE)
                .containsEntry(ApimHeaders.ORIGIN, "https://www.sofinco.fr")
                .containsEntry(ApimHeaders.REFERER, "https://www.sofinco.fr/");
        assertThat(headers.get(ApimHeaders.CORRELATION_ID)).isNotBlank();
    }

    @Test
    void post_omitsOriginAndRefererWhenBlank() throws Exception {
        executor.post("https://api.sofinco.fr/v3/x", "{}", "", null);
        Map<String, String> headers = headerMap(captureRequest());
        assertThat(headers).doesNotContainKey(ApimHeaders.ORIGIN)
                .doesNotContainKey(ApimHeaders.REFERER);
    }

    @Test
    void execute_ignoresReservedHeadersInExtraHeaders() throws Exception {
        Map<String, String> extras = new HashMap<>();
        extras.put(ApimHeaders.AUTHORIZATION, "Bearer ATTACK");
        extras.put(ApimHeaders.CORRELATION_ID, "spoofed");
        extras.put("X-Custom", "ok");

        executor.execute("https://api.sofinco.fr/v3/x", "POST", "{}", null, extras, null);

        HttpUriRequestBase req = captureRequest();
        // Authorization : on doit voir le vrai Bearer, pas l'attaquant.
        long authCount = Arrays.stream(req.getHeaders(ApimHeaders.AUTHORIZATION)).count();
        assertThat(authCount).isEqualTo(1L);
        assertThat(req.getFirstHeader(ApimHeaders.AUTHORIZATION).getValue())
                .isEqualTo(ApimHeaders.BEARER_PREFIX + "opaque-token-uuid");
        // X-Custom : header non réservé passe.
        assertThat(req.getFirstHeader("X-Custom").getValue()).isEqualTo("ok");
    }

    @Test
    void execute_failsClosed_onInsecureHttpNonLocal() {
        assertThatThrownBy(() -> executor.post("http://api.sofinco.fr/v3/x", "{}", null, null))
                .isInstanceOf(ApimException.class)
                .hasMessageContaining("HTTPS");
    }

    @Test
    void post_emptyExtraHeaders_isAccepted() throws Exception {
        executor.execute("https://api.sofinco.fr/v3/x", "POST", "{}", null,
                Collections.emptyMap(), null);
        Map<String, String> headers = headerMap(captureRequest());
        assertThat(headers).containsKey(ApimHeaders.AUTHORIZATION);
    }

    // --- helpers ---

    private HttpUriRequestBase captureRequest() throws Exception {
        ArgumentCaptor<HttpUriRequestBase> captor = ArgumentCaptor.forClass(HttpUriRequestBase.class);
        verify(http).execute(captor.capture(), anyHandler());
        return captor.getValue();
    }

    /**
     * Matcher typé sur le gestionnaire de réponse.
     *
     * <p>{@code ApimHttpExecutor} appelle {@code client.execute(request, handler)} avec un
     * gestionnaire qui produit un {@link ApimHttpExecutor.ApiCallResult} : c'est donc ce type qui
     * fixe le paramètre {@code T} de la surcharge générique.
     */
    private static HttpClientResponseHandler<ApimHttpExecutor.ApiCallResult> anyHandler() {
        return any();
    }

    private static Map<String, String> headerMap(HttpUriRequestBase req) {
        Map<String, String> map = new HashMap<>();
        for (Header h : req.getHeaders()) {
            map.put(h.getName(), h.getValue());
        }
        return map;
    }
}
