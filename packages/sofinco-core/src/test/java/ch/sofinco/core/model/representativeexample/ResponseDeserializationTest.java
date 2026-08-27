package ch.sofinco.core.model.representativeexample;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Vérifie la désérialisation des fixtures réelles + la tolérance d'alias PB/CR.
 */
class ResponseDeserializationTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void loanResponse_fromPbFixture_trimsProductCodeAndExposesFirstProposal() throws Exception {
        LoanCalculateResponse resp = mapper.readValue(
                getClass().getResourceAsStream("/mocks/loan_pb_response.json"),
                LoanCalculateResponse.class);

        assertThat(resp.productCode()).isEqualTo("PBPERSO ");
        assertThat(resp.productCodeTrimmed()).isEqualTo("PBPERSO");
        assertThat(resp.campaignCode()).isEqualTo("NEOURL14");
        LoanProposal p = resp.firstProposal();
        assertThat(p).isNotNull();
        assertThat(p.dueNumber()).isEqualTo(48);
        assertThat(p.totalAmountWithoutInsurance()).isEqualTo(16513.44);
        assertThat(p.installmentWithoutInsurance().amount()).isEqualTo(344.03);
    }

    @Test
    void revolvingResponse_fromCrFixture_resolvesAliasFields() throws Exception {
        RevolvingCalculateResponse resp = mapper.readValue(
                getClass().getResourceAsStream("/mocks/revolving_cr_response.json"),
                RevolvingCalculateResponse.class);

        assertThat(resp.productCodeTrimmed()).isEqualTo("RESERVE");
        assertThat(resp.capitalAmount()).isEqualTo(3000.0);   // alias amountRequested
        RevolvingProposal p = resp.firstProposal();
        assertThat(p).isNotNull();
        assertThat(p.loanDuration()).isEqualTo(36);           // alias creditDuration
        assertThat(p.totalAmountWithoutInsurance()).isEqualTo(4079.92);  // alias totalDueAmountWithoutInsurance
        assertThat(p.installmentWithoutInsurance().lastAmount()).isEqualTo(89.92);
    }

    @Test
    void firstProposal_isNullWhenNoProposals() throws Exception {
        LoanCalculateResponse resp = mapper.readValue(
                "{\"productCode\":\"X\",\"proposals\":[]}", LoanCalculateResponse.class);
        assertThat(resp.firstProposal()).isNull();
        assertThat(resp.productCodeTrimmed()).isEqualTo("X");
    }

    @Test
    void productCodeTrimmed_isNullSafe() throws Exception {
        RevolvingCalculateResponse resp = mapper.readValue("{}", RevolvingCalculateResponse.class);
        assertThat(resp.productCodeTrimmed()).isNull();
        assertThat(resp.firstProposal()).isNull();
    }
}
