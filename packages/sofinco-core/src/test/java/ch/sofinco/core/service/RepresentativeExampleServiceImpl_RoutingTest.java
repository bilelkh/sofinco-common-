package ch.sofinco.core.service;

import ch.sofinco.core.client.ApimSimulationClient;
import ch.sofinco.core.enums.CreditVariant;
import ch.sofinco.core.exception.ApimException;
import ch.sofinco.core.mapper.RepresentativeExampleMapper;
import ch.sofinco.core.model.representativeexample.LoanCalculateResponse;
import ch.sofinco.core.model.representativeexample.RepresentativeExample;
import ch.sofinco.core.model.representativeexample.SimulationRequest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.Duration;
import java.util.Optional;

import static ch.sofinco.core.service.RepexFixtures.apimMockMode;
import static ch.sofinco.core.service.RepexFixtures.apimReady;
import static ch.sofinco.core.service.RepexFixtures.loanFixtureOpt;
import static ch.sofinco.core.service.RepexFixtures.newService;
import static ch.sofinco.core.service.RepexFixtures.req;
import static ch.sofinco.core.service.RepexFixtures.revolvingFixtureOpt;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Routage (loan vs revolving), forwarding du {@code scaleCode}, et résilience aux échecs APIM
 * (cache last-good + garde-fou RuntimeException).
 *
 * <p>Concern : <b>orchestration de l'appel</b> — étant donné des entrées valides, quel
 * client est appelé avec quels paramètres et comment les échecs sont absorbés.
 */
class RepresentativeExampleServiceImpl_RoutingTest {

    private final ApimService apim = mock(ApimService.class);
    private final ApimSimulationClient client = mock(ApimSimulationClient.class);
    private final RepresentativeExampleServiceImpl service = newService(apim, client);

    // ----------------------------------------------------------------- dispatch by variant

    @Test
    void pretPerso_dispatchesToLoanClient() throws Exception {
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(loanFixtureOpt());

        Optional<RepresentativeExample> res = service.getExample(req("src", "PB", 15000L, 48L, "CRBP"));

        assertThat(res).isPresent();
        assertThat(res.get().variant()).isEqualTo(CreditVariant.PRET_PERSO);
        verify(client).callLoanApi(any(), anyLong(), anyLong(), any(), any());
        verify(client, never()).callRevolvingApi(any(), anyLong(), anyLong(), any());
    }

    @Test
    void rachatCredit_dispatchesToLoanClientWithRacVariant() throws Exception {
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(loanFixtureOpt());

        Optional<RepresentativeExample> res = service.getExample(req("src", "RAC", 15000L, 48L, null));

        assertThat(res).isPresent();
        assertThat(res.get().variant()).isEqualTo(CreditVariant.RACHAT_CREDIT);
        verify(client).callLoanApi(any(), anyLong(), anyLong(), any(), any());
    }

    @Test
    void creditRenouvelable_dispatchesToRevolvingClient() throws Exception {
        apimReady(apim);
        when(client.callRevolvingApi(any(), anyLong(), anyLong(), any())).thenReturn(revolvingFixtureOpt());

        Optional<RepresentativeExample> res = service.getExample(req("src", "CR", 3000L, 36L, null));

        assertThat(res).isPresent();
        assertThat(res.get().variant()).isEqualTo(CreditVariant.CREDIT_RENOUVELABLE);
        verify(client).callRevolvingApi(any(), anyLong(), anyLong(), any());
        verify(client, never()).callLoanApi(any(), anyLong(), anyLong(), any(), any());
    }

    // ----------------------------------------------------------------- scaleCode forwarding

    @Test
    void pretPerso_forwardsScaleCodeWhenPresent() throws Exception {
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(loanFixtureOpt());

        service.getExample(req("src", "PB", 15000L, 48L, "CRBP0000"));

        ArgumentCaptor<String> scale = ArgumentCaptor.forClass(String.class);
        verify(client).callLoanApi(any(), anyLong(), anyLong(), scale.capture(), any());
        assertThat(scale.getValue()).isEqualTo("CRBP0000");
    }

    @Test
    void rachatCredit_doesNotForwardScaleCodeEvenIfRequestHasOne() throws Exception {
        // Le scaleCode du request n'est utilisé que pour PB ; pour RAC on n'envoie pas l'info.
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(loanFixtureOpt());

        service.getExample(req("src", "RAC", 15000L, 48L, "CRBP-IGNORED"));

        ArgumentCaptor<String> scale = ArgumentCaptor.forClass(String.class);
        verify(client).callLoanApi(any(), anyLong(), anyLong(), scale.capture(), any());
        assertThat(scale.getValue()).isNull();
    }

    // ----------------------------------------------------------------- null response handling

    @Test
    void loanNullResponse_returnsEmpty() throws Exception {
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(Optional.empty());
        assertThat(service.getExample(req("src", "PB", 15000L, 48L, null))).isEmpty();
    }

    @Test
    void revolvingNullResponse_returnsEmpty() throws Exception {
        apimReady(apim);
        when(client.callRevolvingApi(any(), anyLong(), anyLong(), any())).thenReturn(Optional.empty());
        assertThat(service.getExample(req("src", "CR", 3000L, 36L, null))).isEmpty();
    }

    // ----------------------------------------------------------------- resilience

    @Test
    void apimThrowsApimException_returnsEmpty_andDoesNotPropagate() throws Exception {
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any()))
                .thenThrow(new ApimException("APIM 503"));
        assertThat(service.getExample(req("src", "PB", 15000L, 48L, null))).isEmpty();
    }

    @Test
    void apimThrowsIoException_returnsEmpty_andDoesNotPropagate() throws Exception {
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any()))
                .thenThrow(new java.io.IOException("connection reset"));
        assertThat(service.getExample(req("src", "PB", 15000L, 48L, null))).isEmpty();
    }

    @Test
    void runtimeFromMapper_returnsEmpty_andDoesNotPropagate() throws Exception {
        // P1.2 : garde-fou contre toute RuntimeException pour ne pas faire cascader Jahia
        // (« bodyEndTag is null » sinon, qui casse toute la page, pas juste le fragment).
        RepresentativeExampleMapper boomMapper = new RepresentativeExampleMapper() {
            @Override
            public RepresentativeExample buildPretPerso(LoanCalculateResponse r, long a, String i) {
                throw new IllegalStateException("simulated NPE deep in mapper");
            }
        };
        RepresentativeExampleServiceImpl svc =
                new RepresentativeExampleServiceImpl(apim, client, boomMapper, Clock.systemUTC());
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(loanFixtureOpt());
        assertThat(svc.getExample(req("src", "PB", 15000L, 48L, null))).isEmpty();
    }

    // ----------------------------------------------------------------- last-good cache

    @Test
    void apimFailure_servesLastGood_whenAvailable_andNotInMockMode() throws Exception {
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any()))
                .thenReturn(loanFixtureOpt())  // 1er appel : succès → mis en cache
                .thenReturn(Optional.empty());          // 2e appel : null → service du last-good

        // Au-delà de la fenêtre de fraîcheur : sans cela le 2e appel serait servi par le
        // dédoublonnage et n'atteindrait pas l'APIM, ce qui n'est pas le chemin testé ici.
        RepexFixtures.ControlClock clock = new RepexFixtures.ControlClock();
        RepresentativeExampleServiceImpl svc = new RepresentativeExampleServiceImpl(
                apim, client, new RepresentativeExampleMapper(), clock);

        SimulationRequest r = req("src-A", "PB", 15000L, 48L, null);
        Optional<RepresentativeExample> first = svc.getExample(r);
        clock.advance(Duration.ofSeconds(61));
        Optional<RepresentativeExample> second = svc.getExample(r);

        assertThat(first).isPresent();
        assertThat(second).isPresent();
        verify(client, times(2)).callLoanApi(any(), anyLong(), anyLong(), any(), any());
    }

    @Test
    void apimFailure_inMockMode_doesNotServeLastGood() throws Exception {
        // Last-good DÉSACTIVÉ en mock (risque conformité — ne pas resservir une réponse fabriquée).
        apimMockMode(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any()))
                .thenReturn(loanFixtureOpt())  // 1er appel : succès, mais PAS mis en cache car mock
                .thenReturn(Optional.empty());          // 2e appel : null → pas de last-good disponible

        SimulationRequest r = req("src-B", "PB", 15000L, 48L, null);
        service.getExample(r);
        Optional<RepresentativeExample> second = service.getExample(r);

        assertThat(second).isEmpty();
    }

    @Test
    void apimFailure_noLastGoodAvailable_returnsEmpty() throws Exception {
        // Pas d'appel précédent réussi → pas de last-good → empty.
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(Optional.empty());
        assertThat(service.getExample(req("src-C", "PB", 15000L, 48L, null))).isEmpty();
    }

    @Test
    void apimException_servesLastGood_whenAvailable() throws Exception {
        // Variante : l'échec arrive sous forme d'exception, pas de null.
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any()))
                .thenReturn(loanFixtureOpt())
                .thenThrow(new ApimException("APIM down"));

        SimulationRequest r = req("src-D", "PB", 15000L, 48L, null);
        service.getExample(r);                              // succès → cache
        Optional<RepresentativeExample> second = service.getExample(r); // exception → last-good

        assertThat(second).isPresent();
    }
}
