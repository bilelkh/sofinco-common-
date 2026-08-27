package ch.sofinco.core.client.http;

import ch.sofinco.core.exception.ApimErrorKind;
import ch.sofinco.core.exception.ApimException;
import ch.sofinco.core.model.representativeexample.CampaignResponse;
import ch.sofinco.core.model.representativeexample.LoanCalculateResponse;
import ch.sofinco.core.model.representativeexample.RevolvingCalculateResponse;
import ch.sofinco.core.service.ApimService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.io.IOException;
import java.util.Optional;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests end-to-end de {@link HttpApimSimulationClient} : URL construction, body JSON, retry 401,
 * désérialisation des réponses 2xx, traitement explicite des 4xx/5xx via {@link Optional#empty()},
 * et traduction des 401 persistants en {@link ApimException} typée
 * {@link ApimErrorKind#AUTH_REJECTED}.
 *
 * <p>Approche : on stub {@link ApimHttpExecutor#post(String, String, String, Function)} pour
 * isoler la logique de mapping URL/body/deserialize sans dépendre du transport HC5 réel.
 */
class HttpApimSimulationClientTest {

    private static final String API_URL = "https://api.sofinco.fr";

    private ApimService apim;
    private ApimHttpExecutor executor;
    private HttpApimSimulationClient client;

    @BeforeEach
    void setUp() {
        apim = mock(ApimService.class);
        executor = mock(ApimHttpExecutor.class);
        when(apim.getApiUrl()).thenReturn(API_URL);
        when(apim.getPartnerId()).thenReturn("web_sofinco");
        client = new HttpApimSimulationClient(apim, executor);
    }

    // ------------------------------------------------------------------ campagnes

    /**
     * ROUTAGE PAR PRODUIT, aligne sur les appels {@code calculate}.
     *
     * <p>Verifie en production dans les DEUX sens : {@code NEOURL41} ({@code loan}) et
     * {@code NEOURL02} ({@code revolving}) repondent en 200 sur l'une comme sur l'autre racine.
     * Le produit ne conditionne donc pas le resultat — il choisit la racine coherente avec
     * l'endpoint {@code calculate} du produit, et rien de plus.
     */
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({
            "PB,  /loanSimulation/v3/",
            "RAC, /loanSimulation/v3/",
            "CR,  /revolvingSimulation/v3/",
    })
    void campaignPath_followsTheProductFamily(String product, String expectedRoot) {
        assertThat(HttpApimSimulationClient.campaignPathTemplate(product)).startsWith(expectedRoot);
    }

    /**
     * Produit absent ou inconnu : on retombe sur {@code revolvingSimulation}.
     *
     * <p>Le choix est ARBITRAIRE — les deux racines servent l'integralite des campagnes — mais il
     * doit rester STABLE : c'est ce repli qu'emprunte le controle de saisie, qui interroge une
     * campagne sans presumer du produit qu'il doit justement verifier.
     */
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.NullSource
    @org.junit.jupiter.params.provider.ValueSource(strings = {"", "INCONNU"})
    void campaignPath_fallsBackToTheUniversalRoot(String product) {
        assertThat(HttpApimSimulationClient.campaignPathTemplate(product))
                .startsWith("/revolvingSimulation/v3/");
    }

    @Test
    void callCampaignApi_returnsTheCampaignOn200() throws Exception {
        String json = loadFixture("/mocks/campaign_pb_response.json");
        when(executor.get(any(), any(), any(), any())).thenReturn(new ApiResult(200, json, "cid-c1"));

        Optional<CampaignResponse> resp = client.callCampaignApi("NEOURL41", "PB", "https://www.sofinco.fr");

        assertThat(resp).isPresent();
        assertThat(resp.get().id()).isEqualTo("NEOURL41");
        assertThat(resp.get().label()).isEqualTo("PRÊT PERSONNEL");
    }

    /**
     * LE cas mesure en production : une provenance inexistante renvoie
     * {@code HTTP 500 {"code":"10","lib":"unexpected SERVER ERROR"}} et non un 404.
     *
     * <p>L'API est heritee et ne sera pas corrigee. On assimile donc 404 ET 500 au meme verdict,
     * faute de pouvoir separer les deux causes — mais RIEN D'AUTRE : cf. les deux tests suivants.
     */
    @Test
    void callCampaignApi_treatsA500AsAnUnknownSource() throws Exception {
        when(executor.get(any(), any(), any(), any())).thenReturn(
                new ApiResult(500, "{\"code\":\"10\",\"lib\":\"unexpected SERVER ERROR\"}", "cid-c2"));

        assertThatThrownBy(() -> client.callCampaignApi("NEOURL028555", null, null))
                .isInstanceOf(ApimException.class)
                .hasMessageContaining("NEOURL028555")
                .hasMessageContaining("500")
                .extracting(e -> ((ApimException) e).kind())
                .isEqualTo(ApimErrorKind.RESOURCE_NOT_FOUND);
    }

    /** Un 404 franc conduit au meme verdict — si l'API venait a se conformer au protocole. */
    @Test
    void callCampaignApi_treatsA404AsAnUnknownSource() throws Exception {
        when(executor.get(any(), any(), any(), any())).thenReturn(new ApiResult(404, "", "cid-c3"));

        assertThatThrownBy(() -> client.callCampaignApi("XXXX", null, null))
                .isInstanceOf(ApimException.class)
                .extracting(e -> ((ApimException) e).kind())
                .isEqualTo(ApimErrorKind.RESOURCE_NOT_FOUND);
    }

    /**
     * UN 401 NE DIT PAS QUE LA CAMPAGNE N'EXISTE PAS — il dit que NOUS ne sommes plus authentifies.
     *
     * <p>Les confondre rendait toute page portant le mixin insauvegardable des l'expiration des
     * identifiants APIM, avec un message affirmant au contributeur que son code de campagne —
     * correct — n'existe pas. Le 401 conserve donc sa semantique
     * {@link ApimErrorKind#AUTH_REJECTED}, comme sur le chemin {@code calculate}.
     */
    @Test
    void callCampaignApi_throwsAuthRejectedOn401Persistent() throws Exception {
        when(executor.get(any(), any(), any(), any())).thenReturn(new ApiResult(401, "", "cid-c4"));

        assertThatThrownBy(() -> client.callCampaignApi("NEOURL41", null, null))
                .isInstanceOf(ApimException.class)
                .extracting(e -> ((ApimException) e).kind())
                .isEqualTo(ApimErrorKind.AUTH_REJECTED);
    }

    /**
     * 403 et 503 : une panne, pas un verdict. Ils ressortent en {@link Optional#empty()}, que
     * {@code CampaignLookup} traduit en « indisponible » — lequel NE BLOQUE AUCUNE saisie.
     *
     * <p>C'est la contrepartie directe du choix ci-dessus : le doute ne se paie plus par un refus.
     */
    @ParameterizedTest(name = "HTTP {0} → indisponible, pas « provenance inexistante »")
    @ValueSource(ints = {403, 502, 503})
    void callCampaignApi_returnsEmptyOnTransientFailures(int httpCode) throws Exception {
        when(executor.get(any(), any(), any(), any())).thenReturn(new ApiResult(httpCode, "", "cid-c5"));

        assertThat(client.callCampaignApi("NEOURL41", null, null)).isEmpty();
    }

    /**
     * UNE SAISIE ERRONEE N'EST PAS UN INCIDENT DE SERVICE.
     *
     * <p>L'endpoint campagnes repond {@code HTTP 500} pour une provenance inexistante. Sans
     * declaration, chaque code mal saisi en contribution ecrivait {@code REQUEST … → HTTP 500}
     * dans le journal d'ERREURS — celui-la meme ou une vraie panne APIM doit ressortir, et qui
     * devenait donc illisible.
     *
     * <p>On verifie ici que l'appel campagne declare bien 404 et 500 comme ATTENDUS, et que les
     * autres codes restent des erreurs a part entiere.
     */
    @Test
    void callCampaignApi_declaresTheExpectedErrorCodesSoTheyDoNotPolluteTheErrorLog() throws Exception {
        when(executor.get(any(), any(), any(), any())).thenReturn(new ApiResult(200, "{}", "cid-c6"));

        client.callCampaignApi("NEOURL41", null, null);

        var expected = org.mockito.ArgumentCaptor.forClass(ApimHttpExecutor.IntPredicate.class);
        verify(executor).get(any(), any(), any(), expected.capture());

        assertThat(expected.getValue().isExpected(404)).as("404 attendu").isTrue();
        assertThat(expected.getValue().isExpected(500)).as("500 attendu").isTrue();
        assertThat(expected.getValue().isExpected(401)).as("401 reste une erreur").isFalse();
        assertThat(expected.getValue().isExpected(503)).as("503 reste une erreur").isFalse();
    }

    /**
     * URL COMPLETE du repli, produit absent : racine universelle + partenaire + provenance.
     *
     * <p>Les tests ci-dessus verifient le CHOIX de la racine ; celui-ci verifie que l'URL assemblee
     * est bien celle attendue de bout en bout — un {@code String.format} mal ordonne passerait
     * autrement inapercu.
     */
    @Test
    void callCampaignApi_buildsTheFullUrlOnTheFallbackRoot() throws Exception {
        String json = loadFixture("/mocks/campaign_pb_response.json");
        when(executor.get(any(), any(), any(), any())).thenReturn(new ApiResult(200, json, "cid-c4"));

        client.callCampaignApi("NEOURL41", null, null);

        org.mockito.ArgumentCaptor<String> url = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(executor).get(url.capture(), any(), any(), any());
        assertThat(url.getValue())
                .isEqualTo(API_URL + "/revolvingSimulation/v3/partners/web_sofinco/campaigns/NEOURL41");
    }

    @Test
    void callLoanApi_buildsExpectedUrlAndReturnsResponse() throws Exception {
        String json = loadFixture("/mocks/loan_pb_response.json");
        when(executor.post(any(), any(), any(), any())).thenReturn(new ApiResult(200, json, "cid-1"));

        Optional<LoanCalculateResponse> resp = client.callLoanApi("NEOURL14", 15000L, 48L, "CRBP0000", "https://www.sofinco.fr");

        assertThat(resp).isPresent();
        assertThat(resp.get().firstProposal()).isNotNull();
        // L'URL doit contenir partnerId + sourceCode validés (path APIM v3 loan).
        verify(executor).post(
                eq("https://api.sofinco.fr/loanSimulation/v3/partners/web_sofinco/campaigns/NEOURL14/simulations/loans/calculate"),
                any(), eq("https://www.sofinco.fr"), any());
    }

    @Test
    void callRevolvingApi_buildsExpectedUrlAndReturnsResponse() throws Exception {
        String json = loadFixture("/mocks/revolving_cr_response.json");
        when(executor.post(any(), any(), any(), any())).thenReturn(new ApiResult(200, json, "cid-2"));

        Optional<RevolvingCalculateResponse> resp = client.callRevolvingApi("NEOURL02", 3000L, 36L, null);

        assertThat(resp).isPresent();
        assertThat(resp.get().firstProposal()).isNotNull();
        verify(executor).post(
                eq("https://api.sofinco.fr/revolvingSimulation/v3/partners/web_sofinco/campaigns/NEOURL02/simulations/revolvings/calculate"),
                any(), any(), any());
    }

    @Test
    void callLoanApi_returnsEmptyOnHttp5xx() throws Exception {
        when(executor.post(any(), any(), any(), any())).thenReturn(new ApiResult(503, "{\"fault\":{}}", "cid-3"));
        Optional<LoanCalculateResponse> resp = client.callLoanApi("NEOURL14", 15000L, 48L, null, null);
        assertThat(resp).isEmpty();
    }

    @Test
    void callLoanApi_returnsEmptyOnHttp4xx() throws Exception {
        when(executor.post(any(), any(), any(), any())).thenReturn(new ApiResult(400, "{\"error\":\"bad\"}", "cid-4"));
        Optional<LoanCalculateResponse> resp = client.callLoanApi("NEOURL14", 15000L, 48L, null, null);
        assertThat(resp).isEmpty();
    }

    @Test
    void callLoanApi_throwsAuthRejectedOn401Persistent() throws Exception {
        // Après le retry géré par l'executor, un 401 final remonte typé AUTH_REJECTED — pas null.
        when(executor.post(any(), any(), any(), any())).thenReturn(new ApiResult(401, "", "cid-5"));
        assertThatThrownBy(() -> client.callLoanApi("NEOURL14", 15000L, 48L, null, null))
                .isInstanceOf(ApimException.class)
                .extracting("kind").isEqualTo(ApimErrorKind.AUTH_REJECTED);
    }

    @Test
    void callLoanApi_throwsIoExceptionOnUnparsableSuccessBody() throws Exception {
        when(executor.post(any(), any(), any(), any())).thenReturn(new ApiResult(200, "<html>", "cid-6"));
        assertThatThrownBy(() -> client.callLoanApi("NEOURL14", 15000L, 48L, null, null))
                .isInstanceOf(IOException.class)
                .hasMessageContaining("parse JSON");
    }

    @Test
    void callLoanApi_validatesAmountAndDuration() {
        assertThatThrownBy(() -> client.callLoanApi("NEOURL14", 0L, 48L, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("amount");
        assertThatThrownBy(() -> client.callLoanApi("NEOURL14", 15000L, -1L, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("duration");
    }

    @Test
    void callLoanApi_rejectsInjectionInSourceCode() {
        assertThatThrownBy(() -> client.callLoanApi("../v2/admin", 15000L, 48L, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sourceCode");
    }

    @Test
    void callLoanApi_returnsEmptyOnEmptyBody() throws Exception {
        when(executor.post(any(), any(), any(), any())).thenReturn(new ApiResult(200, "", "cid-7"));
        Optional<LoanCalculateResponse> resp = client.callLoanApi("NEOURL14", 15000L, 48L, null, null);
        assertThat(resp).isEmpty();
    }

    // ---- helpers

    private static String loadFixture(String path) throws Exception {
        var in = HttpApimSimulationClientTest.class.getResourceAsStream(path);
        if (in == null) {
            throw new IllegalStateException("fixture introuvable: " + path);
        }
        Object obj = new ObjectMapper().readValue(in, Object.class);
        return new ObjectMapper().writeValueAsString(obj);
    }
}
