package ch.sofinco.core.service;

import ch.sofinco.core.client.ApimSimulationClient;
import ch.sofinco.core.enums.CreditVariant;
import ch.sofinco.core.exception.ApimException;
import ch.sofinco.core.mapper.RepresentativeExampleMapper;
import ch.sofinco.core.model.representativeexample.LoanCalculateResponse;
import ch.sofinco.core.model.representativeexample.RepresentativeExample;
import ch.sofinco.core.model.representativeexample.RevolvingCalculateResponse;
import ch.sofinco.core.model.representativeexample.SimulationRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests d'orchestration. Le service appelle {@link ApimSimulationClient} (la décision mock vs live
 * est déléguée à {@code ApimSimulationClientFactory} via OSGi DS).
 *
 * <p>Le {@code @Reference ApimSimulationClient} reçu par OSGi sera le Factory côté runtime, mais
 * en test on mocke directement l'interface. Le {@code RepresentativeExampleService} interroge
 * {@code apim.isReady()} pour décider du court-circuit.
 */
class RepresentativeExampleServiceImplTest {

    private final ApimService apim = mock(ApimService.class);
    private final ApimSimulationClient client = mock(ApimSimulationClient.class);
    private final RepresentativeExampleServiceImpl service =
            new RepresentativeExampleServiceImpl(apim, client, new RepresentativeExampleMapper(), Clock.systemUTC());

    @Test
    void unknownProduct_returnsEmpty() {
        whenApimReady();
        assertThat(service.getExample(req("src", "ZZZ", 1000L, 12L, null))).isEmpty();
    }

    @Test
    void blankSourceCode_returnsEmpty() {
        whenApimReady();
        assertThat(service.getExample(req("", "PB", 1000L, 12L, null))).isEmpty();
    }

    @Test
    void notReady_returnsEmpty() {
        when(apim.isReady()).thenReturn(false);
        assertThat(service.getExample(req("src", "PB", 15000L, 48L, null))).isEmpty();
    }

    @Test
    void livePretPerso_delegatesToClientAndMapper() throws Exception {
        whenApimReady();
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(Optional.of(loanFixture()));

        Optional<RepresentativeExample> res = service.getExample(req("src", "PB", 15000L, 48L, "CRBP"));
        assertThat(res).isPresent();
        assertThat(res.get().variant()).isEqualTo(CreditVariant.PRET_PERSO);
    }

    @Test
    void liveRachatCredit_mapsToRachatVariant() throws Exception {
        whenApimReady();
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(Optional.of(loanFixture()));

        Optional<RepresentativeExample> res = service.getExample(req("src", "RAC", 15000L, 48L, null));
        assertThat(res).isPresent();
        assertThat(res.get().variant()).isEqualTo(CreditVariant.RACHAT_CREDIT);
    }

    @Test
    void scaleCodeOnlyForwardedForPbVariant() throws Exception {
        whenApimReady();
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(Optional.of(loanFixture()));

        service.getExample(req("src", "RAC", 15000L, 48L, "CRBP-IGNORED"));

        ArgumentCaptor<String> scaleArg = ArgumentCaptor.forClass(String.class);
        verify(client).callLoanApi(any(), anyLong(), anyLong(), scaleArg.capture(), any());
        // Pour RAC le scaleCode du request n'est pas passé à l'API.
        assertThat(scaleArg.getValue()).isNull();
    }

    @Test
    void liveNullResponse_returnsEmpty() throws Exception {
        whenApimReady();
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(Optional.empty());
        assertThat(service.getExample(req("src", "PB", 15000L, 48L, null))).isEmpty();
    }

    @Test
    void missingAmountAndDuration_fallBackToJcrConfig() throws Exception {
        whenApimReady();
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(Optional.of(loanFixture()));

        JCRNodeWrapper config = configWith(5000L, 24L);
        service.getExample(new SimulationRequest("src", "PB", null, null, null, null, config, true));

        ArgumentCaptor<Long> amount = ArgumentCaptor.forClass(Long.class);
        ArgumentCaptor<Long> duration = ArgumentCaptor.forClass(Long.class);
        verify(client).callLoanApi(any(), amount.capture(), duration.capture(), any(), any());
        assertThat(amount.getValue()).isEqualTo(5000L);
        assertThat(duration.getValue()).isEqualTo(24L);
    }

    @Test
    void liveCreditRenouvelable_delegatesToRevolvingClient() throws Exception {
        whenApimReady();
        when(client.callRevolvingApi(any(), anyLong(), anyLong(), any())).thenReturn(Optional.of(revolvingFixture()));

        Optional<RepresentativeExample> res = service.getExample(req("src", "CR", 3000L, 36L, null));
        assertThat(res).isPresent();
        assertThat(res.get().variant()).isEqualTo(CreditVariant.CREDIT_RENOUVELABLE);
    }

    @Test
    void liveCreditRenouvelable_nullResponse_returnsEmpty() throws Exception {
        whenApimReady();
        when(client.callRevolvingApi(any(), anyLong(), anyLong(), any())).thenReturn(Optional.empty());
        assertThat(service.getExample(req("src", "CR", 3000L, 36L, null))).isEmpty();
    }

    @Test
    void apimThrows_returnsEmptyAndDoesNotPropagate() throws Exception {
        whenApimReady();
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any()))
                .thenThrow(new ApimException("APIM 503"));
        assertThat(service.getExample(req("src", "PB", 15000L, 48L, null))).isEmpty();
    }

    @Test
    void runtimeFromMapper_returnsEmptyAndDoesNotPropagate() throws Exception {
        // P1.2 : garde-fou contre toute RuntimeException pour ne pas faire cascader Jahia.
        RepresentativeExampleMapper boomMapper = new RepresentativeExampleMapper() {
            @Override
            public RepresentativeExample buildPretPerso(LoanCalculateResponse r, long a, String i) {
                throw new IllegalStateException("simulated NPE deep in mapper");
            }
        };
        RepresentativeExampleServiceImpl svc =
                new RepresentativeExampleServiceImpl(apim, client, boomMapper, Clock.systemUTC());
        whenApimReady();
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(Optional.of(loanFixture()));
        assertThat(svc.getExample(req("src", "PB", 15000L, 48L, null))).isEmpty();
    }

    @Test
    void apimFailure_servesLastGoodWhenAvailable() throws Exception {
        // P1.1 : 1er appel succès → mise en cache. 2e appel APIM en échec → service le last-good.
        // L'horloge avance au-delà de la fenêtre de fraîcheur, sinon le 2e appel serait servi par
        // le dédoublonnage et n'atteindrait jamais l'APIM — ce n'est pas le chemin testé ici.
        whenApimReady();
        when(apim.isMockMode()).thenReturn(false); // cacheable
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any()))
                .thenReturn(Optional.of(loanFixture()))  // 1er appel : succès
                .thenReturn(Optional.empty());          // 2e appel : APIM en échec

        RepexFixtures.ControlClock clock = new RepexFixtures.ControlClock();
        RepresentativeExampleServiceImpl svc = new RepresentativeExampleServiceImpl(
                apim, client, new RepresentativeExampleMapper(), clock);

        SimulationRequest r = req("src-X", "PB", 15000L, 48L, null);
        Optional<RepresentativeExample> first = svc.getExample(r);
        clock.advance(java.time.Duration.ofSeconds(61));
        Optional<RepresentativeExample> second = svc.getExample(r);

        assertThat(first).isPresent();
        assertThat(second).isPresent();
        verify(client, times(2)).callLoanApi(any(), anyLong(), anyLong(), any(), any());
    }

    @Test
    void apimFailure_inMockMode_doesNotServeLastGood() throws Exception {
        // Last-good DÉSACTIVÉ en mock (risque conformité).
        whenApimReady();
        when(apim.isMockMode()).thenReturn(true);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any()))
                .thenReturn(Optional.of(loanFixture()))
                .thenReturn(Optional.empty());

        SimulationRequest r = req("src-Y", "PB", 15000L, 48L, null);
        service.getExample(r);                       // succès, mais pas mis en cache car mock
        Optional<RepresentativeExample> second = service.getExample(r); // null → pas de last-good

        assertThat(second).isEmpty();
    }

    // ----------------------------------------------------------------- rejectionReason (statique)

    @Test
    void rejectionReason_unknownProduct() {
        Optional<String> r = RepresentativeExampleServiceImpl.rejectionReason(
                req("src", "ZZZ", 1L, 1L, null), true);
        assertThat(r).isPresent().get().asString().contains("inconnu");
    }

    @Test
    void rejectionReason_blankSourceCode() {
        Optional<String> r = RepresentativeExampleServiceImpl.rejectionReason(
                req("", "PB", 1L, 1L, null), true);
        assertThat(r).isPresent().get().asString().contains("sourceCode");
    }

    @Test
    void rejectionReason_apimNotReady() {
        Optional<String> r = RepresentativeExampleServiceImpl.rejectionReason(
                req("src", "PB", 1L, 1L, null), false);
        assertThat(r).isPresent().get().asString().contains("non prêt");
    }

    @Test
    void rejectionReason_emptyWhenAllValid() {
        Optional<String> r = RepresentativeExampleServiceImpl.rejectionReason(
                req("src", "PB", 1L, 1L, null), true);
        assertThat(r).isEmpty();
    }

    // ----------------------------------------------------------------- helpers

    private void whenApimReady() {
        when(apim.isReady()).thenReturn(true);
        when(apim.getOrigin()).thenReturn("");
    }

    private RevolvingCalculateResponse revolvingFixture() throws Exception {
        return new ObjectMapper().readValue(
                getClass().getResourceAsStream("/mocks/revolving_cr_response.json"),
                RevolvingCalculateResponse.class);
    }

    private static SimulationRequest req(String src, String product, Long amount, Long duration, String scale) {
        return new SimulationRequest(src, product, amount, duration, scale, null, null, true);
    }

    private LoanCalculateResponse loanFixture() throws Exception {
        return new ObjectMapper().readValue(
                getClass().getResourceAsStream("/mocks/loan_pb_response.json"), LoanCalculateResponse.class);
    }

    private static JCRNodeWrapper configWith(long amount, long duration) throws Exception {
        JCRNodeWrapper node = mock(JCRNodeWrapper.class);
        stubLong(node, "defaultAmount", amount);
        stubLong(node, "defaultDuration", duration);
        return node;
    }

    private static void stubLong(JCRNodeWrapper node, String prop, long value) throws Exception {
        JCRPropertyWrapper p = mock(JCRPropertyWrapper.class);
        when(node.hasProperty(prop)).thenReturn(true);
        when(node.getProperty(prop)).thenReturn(p);
        when(p.getLong()).thenReturn(value);
    }
}
