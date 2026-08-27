package ch.sofinco.core.model.representativeexample;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;

class RequestFactoriesTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void loanForExample_wrapsDurationAndInsuredBorrower_omitsBlankScaleCode() throws Exception {
        LoanCalculateRequest req = LoanCalculateRequest.forExample("10000", 48, null);
        assertThat(req.amount()).isEqualTo("10000");
        assertThat(req.durations()).containsExactly(48);
        assertThat(req.borrower().hasInsurance()).isTrue();
        assertThat(req.scaleCode()).isNull();

        String json = mapper.writeValueAsString(req);
        assertThat(json).contains("\"amount\":\"10000\"")
                .contains("\"durations\":[48]")
                .doesNotContain("scaleCode")   // NON_NULL → omis
                .doesNotContain("coBorrower");
    }

    @Test
    void loanForExample_includesScaleCodeWhenPresent() {
        LoanCalculateRequest req = LoanCalculateRequest.forExample("10000", 36, "CRBP0000");
        assertThat(req.scaleCode()).isEqualTo("CRBP0000");
    }

    @Test
    void revolvingForExample_usesNumberAmountAndBorrowersParameter() {
        RevolvingCalculateRequest req = RevolvingCalculateRequest.forExample(3000L, 36);
        assertThat(req.amount()).isEqualTo(3000L);
        assertThat(req.durations()).containsExactly(36);
        assertThat(req.borrowersParameter().hasInsurance()).isTrue();
        assertThat(req.borrowersParameter().insuranceCode()).isEmpty();
        assertThat(req.borrowersParameter().socioEconomicClassificationCode()).isEmpty();
    }

    @Test
    void borrowerWithInsurance_setsOnlyHasInsurance() {
        Borrower b = Borrower.withInsurance();
        assertThat(b.hasInsurance()).isTrue();
        assertThat(b.birthDate()).isNull();
        assertThat(b.insuranceCode()).isNull();
    }

    @Test
    void borrowersParameter_normalizesNullToEmpty() {
        BorrowersParameter p = new BorrowersParameter(null, true, null);
        assertThat(p.socioEconomicClassificationCode()).isEmpty();
        assertThat(p.insuranceCode()).isEmpty();
        assertThat(p.hasInsurance()).isTrue();
    }

    @Test
    void loanRequestBuilder_exercisesAllSetters() {
        LoanCalculateRequest r = new LoanCalculateRequest.Builder()
                .amount("100")
                .durations(Collections.singletonList(12))
                .borrower(Borrower.withInsurance())
                .coBorrower(Borrower.withInsurance())
                .offerDate("2026-01-01")
                .scaleCode("S")
                .scaleCodes(Arrays.asList("S1", "S2"))
                .businessProviderId("BP")
                .equipmentCode("EQ")
                .build();

        assertThat(r.coBorrower()).isNotNull();
        assertThat(r.offerDate()).isEqualTo("2026-01-01");
        assertThat(r.scaleCodes()).containsExactly("S1", "S2");
        assertThat(r.businessProviderId()).isEqualTo("BP");
        assertThat(r.equipmentCode()).isEqualTo("EQ");
    }
}
