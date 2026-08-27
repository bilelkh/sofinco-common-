package ch.sofinco.core.service;

import ch.sofinco.core.client.ApimSimulationClient;
import org.jahia.services.content.JCRNodeWrapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static ch.sofinco.core.service.RepexFixtures.apimReady;
import static ch.sofinco.core.service.RepexFixtures.configNodeWith;
import static ch.sofinco.core.service.RepexFixtures.loanFixtureOpt;
import static ch.sofinco.core.service.RepexFixtures.newService;
import static ch.sofinco.core.service.RepexFixtures.req;
import static ch.sofinco.core.service.RepexFixtures.reqWithConfig;
import static ch.sofinco.core.service.RepexFixtures.reqWithOrigin;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Résolution des valeurs par défaut (amount / duration depuis JCR ou constantes du service)
 * et résolution de l'Origin effectif.
 *
 * <p>Concern : <b>résolution amont</b> — comment les paramètres effectifs envoyés à l'APIM
 * sont calculés à partir du request + config JCR + ApimService.
 */
class RepresentativeExampleServiceImpl_ResolutionTest {

    private static final long DEFAULT_AMOUNT = 5000L;
    private static final long DEFAULT_DURATION = 48L;

    private final ApimService apim = mock(ApimService.class);
    private final ApimSimulationClient client = mock(ApimSimulationClient.class);
    private final RepresentativeExampleServiceImpl service = newService(apim, client);

    // ----------------------------------------------------------------- amount / duration

    @Test
    void requestProvidesAmountAndDuration_passedAsIs() throws Exception {
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(loanFixtureOpt());

        service.getExample(req("src", "PB", 9999L, 24L, null));

        ArgumentCaptor<Long> amount = ArgumentCaptor.forClass(Long.class);
        ArgumentCaptor<Long> duration = ArgumentCaptor.forClass(Long.class);
        verify(client).callLoanApi(any(), amount.capture(), duration.capture(), any(), any());
        assertThat(amount.getValue()).isEqualTo(9999L);
        assertThat(duration.getValue()).isEqualTo(24L);
    }

    @Test
    void missingAmount_fallsBackToJcrDefault() throws Exception {
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(loanFixtureOpt());

        JCRNodeWrapper config = configNodeWith(5000L, 24L);
        service.getExample(reqWithConfig("src", "PB", null, 48L, null, config));

        ArgumentCaptor<Long> amount = ArgumentCaptor.forClass(Long.class);
        verify(client).callLoanApi(any(), amount.capture(), anyLong(), any(), any());
        assertThat(amount.getValue()).isEqualTo(5000L);
    }

    @Test
    void missingDuration_fallsBackToJcrDefault() throws Exception {
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(loanFixtureOpt());

        JCRNodeWrapper config = configNodeWith(5000L, 24L);
        service.getExample(reqWithConfig("src", "PB", 10000L, null, null, config));

        ArgumentCaptor<Long> duration = ArgumentCaptor.forClass(Long.class);
        verify(client).callLoanApi(any(), anyLong(), duration.capture(), any(), any());
        assertThat(duration.getValue()).isEqualTo(24L);
    }

    @Test
    void zeroAmount_treatedAsMissing_fallsBackToJcrDefault() throws Exception {
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(loanFixtureOpt());

        JCRNodeWrapper config = configNodeWith(5000L, 24L);
        service.getExample(reqWithConfig("src", "PB", 0L, 48L, null, config));

        ArgumentCaptor<Long> amount = ArgumentCaptor.forClass(Long.class);
        verify(client).callLoanApi(any(), amount.capture(), anyLong(), any(), any());
        assertThat(amount.getValue()).isEqualTo(5000L);
    }

    @Test
    void negativeAmount_treatedAsMissing() throws Exception {
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(loanFixtureOpt());

        JCRNodeWrapper config = configNodeWith(5000L, 24L);
        service.getExample(reqWithConfig("src", "PB", -100L, 48L, null, config));

        ArgumentCaptor<Long> amount = ArgumentCaptor.forClass(Long.class);
        verify(client).callLoanApi(any(), amount.capture(), anyLong(), any(), any());
        assertThat(amount.getValue()).isEqualTo(5000L);
    }

    @Test
    void nullConfigNodeAndMissingRequestValues_usesHardCodedDefaults() throws Exception {
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(loanFixtureOpt());

        // Ni request.amount ni config JCR → defaults durs (5000, 48).
        service.getExample(req("src", "PB", null, null, null));

        ArgumentCaptor<Long> amount = ArgumentCaptor.forClass(Long.class);
        ArgumentCaptor<Long> duration = ArgumentCaptor.forClass(Long.class);
        verify(client).callLoanApi(any(), amount.capture(), duration.capture(), any(), any());
        assertThat(amount.getValue()).isEqualTo(DEFAULT_AMOUNT);
        assertThat(duration.getValue()).isEqualTo(DEFAULT_DURATION);
    }

    @Test
    void configNodeWithoutDefaultProps_fallsBackToHardCodedDefaults() throws Exception {
        apimReady(apim);
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(loanFixtureOpt());

        // ConfigNode présent mais sans defaultAmount/defaultDuration → defaults durs.
        JCRNodeWrapper emptyConfig = configNodeWith(null, null);
        service.getExample(reqWithConfig("src", "PB", null, null, null, emptyConfig));

        ArgumentCaptor<Long> amount = ArgumentCaptor.forClass(Long.class);
        ArgumentCaptor<Long> duration = ArgumentCaptor.forClass(Long.class);
        verify(client).callLoanApi(any(), amount.capture(), duration.capture(), any(), any());
        assertThat(amount.getValue()).isEqualTo(DEFAULT_AMOUNT);
        assertThat(duration.getValue()).isEqualTo(DEFAULT_DURATION);
    }

    // ----------------------------------------------------------------- effective origin

    @Test
    void apimConfigOrigin_overridesRequestOrigin() throws Exception {
        when(apim.isReady()).thenReturn(true);
        when(apim.isMockMode()).thenReturn(false);
        when(apim.getOrigin()).thenReturn("https://www.sofinco.fr");
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(loanFixtureOpt());

        service.getExample(reqWithOrigin("src", "PB", 15000L, 48L, null, "https://other.example.com"));

        ArgumentCaptor<String> origin = ArgumentCaptor.forClass(String.class);
        verify(client).callLoanApi(any(), anyLong(), anyLong(), any(), origin.capture());
        assertThat(origin.getValue()).isEqualTo("https://www.sofinco.fr");
    }

    @Test
    void requestOriginUsed_whenApimConfigOriginBlank() throws Exception {
        when(apim.isReady()).thenReturn(true);
        when(apim.isMockMode()).thenReturn(false);
        when(apim.getOrigin()).thenReturn("");
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(loanFixtureOpt());

        service.getExample(reqWithOrigin("src", "PB", 15000L, 48L, null, "https://www.partner.com"));

        ArgumentCaptor<String> origin = ArgumentCaptor.forClass(String.class);
        verify(client).callLoanApi(any(), anyLong(), anyLong(), any(), origin.capture());
        assertThat(origin.getValue()).isEqualTo("https://www.partner.com");
    }

    @Test
    void effectiveOriginNull_whenBothBlank() throws Exception {
        when(apim.isReady()).thenReturn(true);
        when(apim.isMockMode()).thenReturn(false);
        when(apim.getOrigin()).thenReturn("");
        when(client.callLoanApi(any(), anyLong(), anyLong(), any(), any())).thenReturn(loanFixtureOpt());

        service.getExample(reqWithOrigin("src", "PB", 15000L, 48L, null, null));

        ArgumentCaptor<String> origin = ArgumentCaptor.forClass(String.class);
        verify(client).callLoanApi(any(), anyLong(), anyLong(), any(), origin.capture());
        assertThat(origin.getValue()).isNull();
    }
}
