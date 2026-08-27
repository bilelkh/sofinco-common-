package ch.sofinco.core.service;

import ch.sofinco.core.client.ApimSimulationClient;
import ch.sofinco.core.model.representativeexample.SimulationRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.stream.Stream;

import static ch.sofinco.core.service.RepexFixtures.apimReady;
import static ch.sofinco.core.service.RepexFixtures.newService;
import static ch.sofinco.core.service.RepexFixtures.req;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Préconditions de {@link RepresentativeExampleServiceImpl#getExample}. Black-box : on observe
 * uniquement l'entrée du service et son résultat (présent / vide), sans regarder les détails
 * d'appel APIM (couverts par {@code _RoutingTest}).
 *
 * <p>Concern : <b>validation amont</b> — toute entrée qui ne devrait jamais déclencher d'appel
 * APIM doit produire un {@code Optional.empty()} <em>sans</em> toucher le client.
 */
class RepresentativeExampleServiceImplValidationTest {

    private final ApimService apim = mock(ApimService.class);
    private final ApimSimulationClient client = mock(ApimSimulationClient.class);
    private final RepresentativeExampleServiceImpl service = newService(apim, client);

    /**
     * Le garde-fou doit couvrir la VALIDATION, pas seulement l'appel.
     *
     * <p>{@code isReady()} interroge un service externe : il peut lever. Tant qu'il siégeait hors
     * du {@code try}, une RuntimeException atteignait la frontière JS de Jahia, où le moteur
     * cascade en « bodyEndTag is null » — ce n'est plus le fragment exemple représentatif qui
     * disparaît, c'est la page entière qui casse.
     */
    @Test
    void isReadyThrowing_returnsEmpty_ratherThanBreakingTheWholePage() throws Exception {
        when(apim.isReady()).thenThrow(new IllegalStateException("APIM injoignable"));

        assertThat(service.getExample(req("PBPERSO", "PB", 15000L, 48L, "CRBP"))).isEmpty();
        verify(client, never()).callLoanApi(any(), anyLong(), anyLong(), any(), any());
    }

    @Test
    void nullRequest_returnsEmpty_andDoesNotCallApim() throws Exception {
        assertThat(service.getExample(null)).isEmpty();
        verify(client, never()).callLoanApi(any(), anyLong(), anyLong(), any(), any());
        verify(client, never()).callRevolvingApi(any(), anyLong(), anyLong(), any());
    }

    /**
     * Une requête rejetée à la validation ne doit jamais atteindre l'APIM, quel que soit le champ
     * fautif.
     */
    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidRequests")
    void invalidRequest_returnsEmpty_andDoesNotCallApim(String intent, SimulationRequest request)
            throws Exception {
        apimReady(apim);
        assertThat(service.getExample(request)).isEmpty();
        verify(client, never()).callLoanApi(any(), anyLong(), anyLong(), any(), any());
    }

    static Stream<Arguments> invalidRequests() {
        return Stream.of(
                arguments("produit inconnu", req("src", "ZZZ", 1000L, 12L, null)),
                arguments("produit null", req("src", null, 1000L, 12L, null)),
                arguments("sourceCode vide", req("", "PB", 1000L, 12L, null)));
    }

    @Test
    void emptyProduct_returnsEmpty() {
        apimReady(apim);
        assertThat(service.getExample(req("src", "", 1000L, 12L, null))).isEmpty();
    }

    @Test
    void whitespaceOnlySourceCode_returnsEmpty() {
        apimReady(apim);
        assertThat(service.getExample(req("   ", "PB", 1000L, 12L, null))).isEmpty();
    }

    @Test
    void nullSourceCode_returnsEmpty() {
        apimReady(apim);
        assertThat(service.getExample(req(null, "PB", 1000L, 12L, null))).isEmpty();
    }

    @Test
    void apimNotReady_returnsEmpty_andDoesNotCallClient() throws Exception {
        when(apim.isReady()).thenReturn(false);
        assertThat(service.getExample(req("src", "PB", 15000L, 48L, null))).isEmpty();
        verify(client, never()).callLoanApi(any(), anyLong(), anyLong(), any(), any());
    }

    @Test
    void apimNotReady_overridesValidProductAndSourceCode() {
        // Sanity : même avec product + sourceCode valides, si APIM pas prêt → empty.
        when(apim.isReady()).thenReturn(false);
        assertThat(service.getExample(req("NEOURL14", "PB", 15000L, 48L, "CRBP0000"))).isEmpty();
    }
}
