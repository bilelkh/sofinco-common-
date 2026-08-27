package ch.sofinco.core.client.http;

import ch.sofinco.core.model.representativeexample.CampaignResponse;
import ch.sofinco.core.model.representativeexample.LoanCalculateResponse;
import ch.sofinco.core.model.representativeexample.RevolvingCalculateResponse;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MockApimSimulationClientTest {

    private final MockApimSimulationClient mock = new MockApimSimulationClient();

    // ------------------------------------------------------------------ campagnes

    /**
     * Une fixture PAR VARIANTE : les bornes d'un Credit Renouvelable n'ont rien a voir avec celles
     * d'un Pret Personnel. Servir la meme a tout le monde ferait passer en mock des saisies que la
     * production refuserait — et inversement.
     */
    @Test
    void campaignCall_returnsThePersonalLoanFixtureByDefault() throws Exception {
        Optional<CampaignResponse> resp = mock.callCampaignApi("NEOURL41", null, null);

        assertThat(resp).isPresent();
        assertThat(resp.get().id()).isEqualTo("NEOURL41");
        assertThat(resp.get().type()).isEqualTo("loan");
        assertThat(resp.get().minAmount()).isEqualTo(3001.0);
        assertThat(resp.get().maxDuration()).isEqualTo(120);
    }

    @Test
    void campaignCall_returnsTheRevolvingFixtureForItsSourceCode() throws Exception {
        Optional<CampaignResponse> resp = mock.callCampaignApi("NEOURL02", null, null);

        assertThat(resp).isPresent();
        assertThat(resp.get().type()).isEqualTo("revolving");
        assertThat(resp.get().minAmount()).isEqualTo(150.0);
        assertThat(resp.get().maxAmount()).isEqualTo(10000.0);
    }

    /**
     * Meme heuristique que pour les simulations : router differemment ferait cohabiter un exemple
     * de Rachat de Credits avec les bornes d'un Pret Personnel, incoherence qui n'existe sur aucun
     * environnement reel.
     */
    @Test
    void campaignCall_returnsTheDebtConsolidationFixtureForRacSourceCodes() throws Exception {
        assertThat(mock.callCampaignApi("NEOURL04", null, null)).get()
                .extracting(CampaignResponse::id).isEqualTo("NEOURL04");
        assertThat(mock.callCampaignApi("un-code-RAC-quelconque", null, null)).get()
                .extracting(CampaignResponse::minDuration).isEqualTo(36);
    }

    /**
     * Provenance inconnue du mock : repli sur le Pret Personnel plutot qu'une reponse vide, qui
     * ferait echouer des rendus corrects sur un environnement de developpement.
     */
    @Test
    void campaignCall_fallsBackToPersonalLoanForAnUnknownSource() throws Exception {
        assertThat(mock.callCampaignApi("PROVENANCE-INCONNUE", null, null)).get()
                .extracting(CampaignResponse::id).isEqualTo("NEOURL41");
    }

    /** Les libelles portent leurs accents : c'est sur eux que le controle de saisie compare. */
    @Test
    void campaignFixturesCarryTheirAccentedLabels() throws Exception {
        assertThat(mock.callCampaignApi("NEOURL41", null, null)).get()
                .extracting(CampaignResponse::label).isEqualTo("PRÊT PERSONNEL");
        assertThat(mock.callCampaignApi("NEOURL02", null, null)).get()
                .extracting(CampaignResponse::label).isEqualTo("CRÉDIT RENOUVELABLE");
        assertThat(mock.callCampaignApi("NEOURL04", null, null)).get()
                .extracting(CampaignResponse::label).isEqualTo("RACHAT DE CRÉDITS");
    }

    @Test
    void loanCall_returnsFixtureForPbSourceCode() throws Exception {
        Optional<LoanCalculateResponse> resp = mock.callLoanApi("NEOURL14", 15000L, 48L, "CRBP0000", null);
        assertThat(resp).isPresent();
        assertThat(resp.get().firstProposal()).isNotNull();
        assertThat(resp.get().capitalAmount()).isNotNull();
    }

    @Test
    void loanCall_returnsRacFixtureWhenSourceContainsRac() throws Exception {
        Optional<LoanCalculateResponse> resp = mock.callLoanApi("NEOURL04", 10000L, 60L, null, null);
        assertThat(resp).isPresent();
        assertThat(resp.get().firstProposal()).isNotNull();
    }

    @Test
    void revolvingCall_returnsCrFixture() throws Exception {
        Optional<RevolvingCalculateResponse> resp = mock.callRevolvingApi("NEOURL02", 3000L, 36L, null);
        assertThat(resp).isPresent();
        assertThat(resp.get().firstProposal()).isNotNull();
    }

    @Test
    void mockValidatesAmountAndDuration_parityWithHttp() {
        // Parité Mock/HTTP : la validation de bornes doit échouer pareillement quel que soit le mode.
        assertThatThrownBy(() -> mock.callLoanApi("src", 0L, 36L, null, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> mock.callRevolvingApi("src", 3000L, 0L, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void isRacSourceCode_handlesCaseAndLocale() {
        // Locale.ROOT garantit que "ci" en TR ne devient pas "Cİ".
        assertThat(MockApimSimulationClient.isRacSourceCode("NEOURL04")).isTrue();
        assertThat(MockApimSimulationClient.isRacSourceCode("rac")).isTrue();
        assertThat(MockApimSimulationClient.isRacSourceCode("anyRACvariant")).isTrue();
        assertThat(MockApimSimulationClient.isRacSourceCode("NEOURL14")).isFalse();
        assertThat(MockApimSimulationClient.isRacSourceCode(null)).isFalse();
    }
}
