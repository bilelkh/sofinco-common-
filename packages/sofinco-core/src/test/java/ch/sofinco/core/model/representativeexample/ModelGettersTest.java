package ch.sofinco.core.model.representativeexample;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exerce l'ensemble des accesseurs des records Jackson via la fixture PB réelle
 * (qui peuple tous les champs, y compris {@code maxProposal} et {@code borrowerInsurance}).
 */
class ModelGettersTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void loanResponseAndProposalGetters() throws Exception {
        LoanCalculateResponse resp = mapper.readValue(
                getClass().getResourceAsStream("/mocks/loan_pb_response.json"),
                LoanCalculateResponse.class);

        assertThat(resp.id()).isEqualTo("b01b22fc8fb80e1b0f910e526ea88094e54f5d54");
        assertThat(resp.capitalAmount()).isEqualTo(15000.0);
        assertThat(resp.label()).isEqualTo("PRÊT PERSONNEL");

        LoanProposal p = resp.firstProposal();
        Assertions.assertNotNull(p);
        assertThat(p.loanDuration()).isEqualTo(48);
        assertThat(p.dueNumber()).isEqualTo(48);
        assertThat(p.dueDeferralNumber()).isZero();
        assertThat(p.scaleCode()).isEqualTo("CRBP0000");
        assertThat(p.annualDebitRate()).isEqualTo(4.793);
        assertThat(p.annualGlobalEffectiveRate()).isEqualTo(4.9);
        assertThat(p.annualChargeRate()).isEqualTo(0.0);
        assertThat(p.annualInsuranceEffectiveRate()).isEqualTo(2.419);
        assertThat(p.contractFees()).isEqualTo(0.0);
        assertThat(p.totalCostWithoutInsurance()).isEqualTo(1513.44);
        assertThat(p.totalCostWithInsurance()).isEqualTo(2269.44);
        assertThat(p.totalCostWithInsuranceAndServices()).isEqualTo(2269.44);
    }

    /** Suite du précédent : montants, drapeaux et sous-objets de la proposition. */
    @Test
    void loanProposalAmountsAndFlagsGetters() throws Exception {
        LoanProposal p = firstLoanProposal();

        assertThat(p.fixedRate()).isTrue();
        assertThat(p.totalAmountWithoutInsurance()).isEqualTo(16513.44);
        assertThat(p.totalAmountWithInsurance()).isEqualTo(17269.44);
        assertThat(p.overdraftChargesAmount()).isEqualTo(1513.44);
        assertThat(p.personInsuranceTotalAmount()).isEqualTo(756.0);
        assertThat(p.hasBorrowerInsurance()).isTrue();
        assertThat(p.hasCoBorrowerInsurance()).isFalse();
        assertThat(p.coBorrowerInsurance()).isNull();
        assertThat(p.alternativeBorrowerInsurance()).isEmpty();
        assertThat(p.alternativeCoBorrowerInsurance()).isEmpty();
        assertThat(p.maxProposal()).isNotNull();
        assertThat(p.maxProposal().scaleCode()).isEqualTo("CRBPMAX");
    }

    /** Première proposition de la fixture PB réelle. */
    private LoanProposal firstLoanProposal() throws Exception {
        LoanProposal p = mapper.readValue(
                getClass().getResourceAsStream("/mocks/loan_pb_response.json"),
                LoanCalculateResponse.class).firstProposal();
        Assertions.assertNotNull(p);
        return p;
    }

    @Test
    void installmentAndInsuranceGetters() throws Exception {
        LoanProposal p = firstLoanProposal();

        Installment inst = p.installmentWithoutInsurance();
        assertThat(inst.amount()).isEqualTo(344.03);
        assertThat(inst.firstAmount()).isEqualTo(344.03);
        assertThat(inst.lastAmount()).isEqualTo(344.03);
        assertThat(inst.totalDueNumber()).isEqualTo(48);
        assertThat(inst.dueNumber()).isEqualTo(48);
        assertThat(p.installmentWithInsurance().amount()).isEqualTo(359.78);

        InsuranceProposal ins = p.borrowerInsurance();
        assertThat(ins.insuranceCode()).isEqualTo("01");
        assertThat(ins.totalInsuranceCost()).isEqualTo(756.0);
        assertThat(ins.insuranceProducts()).isNull();
        assertThat(ins.insuranceInstallment().amount()).isEqualTo(15.75);
    }

    @Test
    void revolvingResponseGetters() throws Exception {
        RevolvingCalculateResponse resp = mapper.readValue(
                getClass().getResourceAsStream("/mocks/revolving_cr_response.json"),
                RevolvingCalculateResponse.class);

        assertThat(resp.id()).isEqualTo("1a345455c611bd1a56fe95d42d66d5f7d374b295");
        assertThat(resp.label()).isEqualTo("CRÉDIT RENOUVELABLE");
        assertThat(resp.campaignCode()).isEqualTo("NEOURL02");
        assertThat(resp.proposals()).hasSize(1);
    }
}
