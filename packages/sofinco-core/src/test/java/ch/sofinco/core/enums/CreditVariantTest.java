package ch.sofinco.core.enums;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CreditVariantTest {

    @Test
    void fromProduct_mapsKnownCodesCaseInsensitive() {
        assertThat(CreditVariant.fromProduct("PB")).isEqualTo(CreditVariant.PRET_PERSO);
        assertThat(CreditVariant.fromProduct("rac")).isEqualTo(CreditVariant.RACHAT_CREDIT);
        assertThat(CreditVariant.fromProduct("Cr")).isEqualTo(CreditVariant.CREDIT_RENOUVELABLE);
    }

    @Test
    void fromProduct_returnsNullOnUnknownOrNull() {
        assertThat(CreditVariant.fromProduct("XX")).isNull();
        assertThat(CreditVariant.fromProduct(null)).isNull();
    }

    @Test
    void predicates() {
        assertThat(CreditVariant.PRET_PERSO.isLoan()).isTrue();
        assertThat(CreditVariant.RACHAT_CREDIT.isLoan()).isTrue();
        assertThat(CreditVariant.CREDIT_RENOUVELABLE.isLoan()).isFalse();
        assertThat(CreditVariant.CREDIT_RENOUVELABLE.isCreditRenouvelable()).isTrue();
        assertThat(CreditVariant.PRET_PERSO.isCreditRenouvelable()).isFalse();
    }

    @Test
    void perVariantData() {
        assertThat(CreditVariant.PRET_PERSO.mockResourcePath()).isEqualTo("/mocks/loan_pb_response.json");
        assertThat(CreditVariant.RACHAT_CREDIT.mockResourcePath()).isEqualTo("/mocks/loan_rac_response.json");
        assertThat(CreditVariant.CREDIT_RENOUVELABLE.mockResourcePath()).isEqualTo("/mocks/revolving_cr_response.json");

        assertThat(CreditVariant.PRET_PERSO.insuranceJcrProp()).isEqualTo("insurancePB");
        assertThat(CreditVariant.RACHAT_CREDIT.insuranceJcrProp()).isEqualTo("insuranceRAC");
        assertThat(CreditVariant.CREDIT_RENOUVELABLE.insuranceJcrProp()).isEqualTo("insuranceCR");

        assertThat(CreditVariant.PRET_PERSO.jsString()).isEqualTo("pretPerso");
        assertThat(CreditVariant.RACHAT_CREDIT.jsString()).isEqualTo("rachatCredit");
        assertThat(CreditVariant.CREDIT_RENOUVELABLE.jsString()).isEqualTo("creditRenouvelable");

        assertThat(CreditVariant.PRET_PERSO.usesRevolvingApi()).isFalse();
        assertThat(CreditVariant.CREDIT_RENOUVELABLE.usesRevolvingApi()).isTrue();

        assertThat(CreditVariant.PRET_PERSO.endpointPathTemplate())
                .contains("/loanSimulation/v3/partners/%s/campaigns/%s/");
        assertThat(CreditVariant.CREDIT_RENOUVELABLE.endpointPathTemplate())
                .contains("/revolvingSimulation/v3/partners/%s/campaigns/%s/");
    }
}
