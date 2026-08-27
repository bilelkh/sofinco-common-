package ch.sofinco.core.mapper;

import ch.sofinco.core.enums.CreditVariant;
import ch.sofinco.core.model.representativeexample.LoanCalculateResponse;
import ch.sofinco.core.model.representativeexample.RepresentativeExample;
import ch.sofinco.core.model.representativeexample.RevolvingCalculateResponse;
import ch.sofinco.core.model.representativeexample.Row;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RepresentativeExampleMapperTest {

    private final ObjectMapper json = new ObjectMapper();
    private final RepresentativeExampleMapper mapper = new RepresentativeExampleMapper();

    private static final String K_MONTHLY  = "representativeExample.row.monthlyPayment";
    private static final String K_LAST_ADJ = "representativeExample.row.lastPaymentAdjusted";
    private static final String K_DURATION = "representativeExample.row.duration";
    private static final String K_FILE_FEES = "representativeExample.row.fileFees";
    private static final String K_TOTAL_DUE = "representativeExample.row.totalDue";

    // ----------------------------------------------------------------- PB

    @Test
    void buildPretPerso_producesOrderedRowsAndInsuranceMap() throws Exception {
        RepresentativeExample ex = mapper.buildPretPerso(loadLoan("/mocks/loan_pb_response.json"),
                15000L, "<p>assurance</p>");

        assertThat(ex.variant()).isEqualTo(CreditVariant.PRET_PERSO);
        assertThat(ex.productCode()).isEqualTo("PBPERSO");
        // Le CAPITAL est rendu sans décimales, comme sur l'ancien site
        // (`currency(simulationResult.amount, NO_DECIMAL)`). Les valeurs CALCULÉES des lignes,
        // elles, gardent leurs centimes — cf. les assertions sur les mensualités ci-dessous.
        assertThat(norm(ex.exampleAmount())).isEqualTo("15 000 €");
        // La contrepartie, verrouillee : une ligne CALCULÉE garde ses deux décimales. Sans ce
        // couple d'assertions, uniformiser le formatage passerait inaperçu dans un sens ou l'autre.
        assertThat(norm(ex.rows().get(0).value())).contains(",");
        assertThat(ex.insuranceTextOverride()).isEqualTo("<p>assurance</p>");

        assertThat(value(ex, K_MONTHLY)).isEqualTo("344,03 €");
        Row duration = row(ex, K_DURATION);
        assertThat(duration.value()).isEqualTo("48 mois");
        assertThat(duration.labelParam()).isEqualTo("48");
        assertThat(value(ex, K_FILE_FEES)).isEqualTo("0,00 €");
        Row total = row(ex, K_TOTAL_DUE);
        assertThat(norm(total.value())).isEqualTo("16 513,44 €");
        assertThat(total.highlighted()).isTrue();

        assertThat(ex.insurance())
                .containsEntry("monthlyAmount", "15,75 €")
                .containsEntry("taea", "2,419 %")
                .containsEntry("totalInsuranceCost", "756,00 €")
                .containsEntry("monthlyWithInsurance", "359,78 €")
                .containsEntry("dueNumber", "48")
                .containsEntry("dueNumberMinusOne", "47");
    }

    @Test
    void buildPretPerso_keepsMonthlyRowEvenWithoutInsuredInstallment() throws Exception {
        // Régression : la ligne Mensualités est conditionnée à installmentWithoutInsurance,
        // pas à installmentWithInsurance (qui est absent ici).
        String body = "{\"productCode\":\"PBPERSO\",\"proposals\":[{"
                + "\"dueNumber\":48,\"annualGlobalEffectiveRate\":4.9,\"annualDebitRate\":4.793,"
                + "\"contractFees\":0.0,\"totalAmountWithoutInsurance\":16513.44,"
                + "\"installmentWithoutInsurance\":{\"amount\":344.03,\"lastAmount\":344.03},"
                + "\"installmentWithInsurance\":null}]}";
        LoanCalculateResponse resp = json.readValue(body, LoanCalculateResponse.class);

        RepresentativeExample ex = mapper.buildPretPerso(resp, 15000L, null);
        assertThat(value(ex, K_MONTHLY)).isEqualTo("344,03 €");
    }

    // ----------------------------------------------------------------- RAC

    @Test
    void buildRachatCredit_setsVariantWithoutMutationAndKeepsMonthlyRow() throws Exception {
        // Régression anti-pattern #6 : RAC construit directement, pas un PB ré-altéré.
        RepresentativeExample ex = mapper.buildRachatCredit(loadLoan("/mocks/loan_pb_response.json"),
                15000L, null);
        assertThat(ex.variant()).isEqualTo(CreditVariant.RACHAT_CREDIT);
        assertThat(value(ex, K_MONTHLY)).isEqualTo("344,03 €");
        assertThat(row(ex, K_TOTAL_DUE).highlighted()).isTrue();
    }

    // ----------------------------------------------------------------- CR

    @Test
    void buildCreditRenouvelable_usesNxDisplayAndAdjustedLastRow_noFileFees() throws Exception {
        RepresentativeExample ex = mapper.buildCreditRenouvelable(
                loadRevolving("/mocks/revolving_cr_response.json"), 3000L, null);

        assertThat(ex.variant()).isEqualTo(CreditVariant.CREDIT_RENOUVELABLE);
        assertThat(value(ex, K_MONTHLY)).isEqualTo("35 x 114,00 €");

        Row lastAdj = row(ex, K_LAST_ADJ);
        assertThat(lastAdj.value()).isEqualTo("89,92 €");
        assertThat(lastAdj.labelParam()).isEqualTo("36");

        assertThat(value(ex, K_TOTAL_DUE)).isEqualTo("4 079,92 €");
        assertThat(find(ex, K_FILE_FEES)).isNull();   // pas de frais de dossier en CR
    }

    @Test
    void buildCreditRenouvelable_simpleMonthlyWhenLastEqualsAmount() throws Exception {
        String body = "{\"productCode\":\"RESERVE\",\"proposals\":[{"
                + "\"creditDuration\":24,\"dueNumber\":24,\"annualGlobalEffectiveRate\":20.0,"
                + "\"annualDebitRate\":18.0,\"totalDueAmountWithoutInsurance\":3600.0,"
                + "\"installmentWithoutInsurance\":{\"amount\":150.0,\"lastAmount\":150.0}}]}";
        RevolvingCalculateResponse resp = json.readValue(body, RevolvingCalculateResponse.class);

        RepresentativeExample ex = mapper.buildCreditRenouvelable(resp, 3000L, null);
        assertThat(value(ex, K_MONTHLY)).isEqualTo("150,00 €");   // pas de "N x"
        assertThat(find(ex, K_LAST_ADJ)).isNull();                // pas de ligne ajustée
    }

    // ----------------------------------------------------------------- helpers

    private LoanCalculateResponse loadLoan(String path) throws Exception {
        return json.readValue(getClass().getResourceAsStream(path), LoanCalculateResponse.class);
    }

    private RevolvingCalculateResponse loadRevolving(String path) throws Exception {
        return json.readValue(getClass().getResourceAsStream(path), RevolvingCalculateResponse.class);
    }

    private static Row find(RepresentativeExample ex, String key) {
        List<Row> rows = ex.rows();
        return rows.stream().filter(r -> key.equals(r.labelKey())).findFirst().orElse(null);
    }

    private static Row row(RepresentativeExample ex, String key) {
        Row r = find(ex, key);
        assertThat(r).as("row '%s'", key).isNotNull();
        return r;
    }

    private static String value(RepresentativeExample ex, String key) {
        return norm(row(ex, key).value());
    }

    /** Normalise les espaces insécables (séparateur de milliers de la locale FR). */
    private static String norm(String s) {
        return s == null ? null : s.replace((char) 0x202f, ' ').replace((char) 0x00a0, ' ');
    }
}
