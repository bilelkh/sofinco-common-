package ch.sofinco.core.mapper;

import ch.sofinco.core.enums.CreditVariant;
import ch.sofinco.core.model.representativeexample.LoanCalculateResponse;
import ch.sofinco.core.model.representativeexample.RepresentativeExample;
import ch.sofinco.core.model.representativeexample.RevolvingCalculateResponse;
import ch.sofinco.core.model.representativeexample.Row;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Couverture des branches du {@link RepresentativeExampleMapper} pour le CR (Crédit Renouvelable),
 * et quelques branches loan inattendues (P3.4).
 *
 * <p>Branches testées explicitement :
 * <ul>
 *   <li>CR — dernière mensualité ajustée vs égale (epsilon demi-centime) ;</li>
 *   <li>CR — {@code totalDue=1} ne doit pas afficher "0 x amount" ;</li>
 *   <li>CR — {@code dueNumber=0} ne doit pas produire {@code dueNumberMinusOne=-1} ;</li>
 *   <li>CR — assurance partielle (taux présent / installment absent) ;</li>
 *   <li>CR — assurance entièrement absente → seules les variables hors assurance subsistent ;</li>
 *   <li>PB — jeu complet de variables sur une réponse APIM réelle ;</li>
 *   <li>PB — installmentWithoutInsurance présent mais avec amount null ;</li>
 *   <li>RAC — variant correct préservé sans mutation du PB en entrée.</li>
 * </ul>
 */
class RepresentativeExampleMapperBranchTest {

    private static final String K_MONTHLY  = "representativeExample.row.monthlyPayment";
    private static final String K_LAST_ADJ = "representativeExample.row.lastPaymentAdjusted";
    private static final String K_DURATION = "representativeExample.row.duration";

    private final ObjectMapper json = new ObjectMapper();
    private final RepresentativeExampleMapper mapper = new RepresentativeExampleMapper();

    // ----------------------------------------------------------------- CR : dernière mensualité ajustée

    @Test
    void cr_lastPaymentAdjusted_andTotalDueGreaterThanOne_showsNMinus1Format() throws Exception {
        // lastAmount=89.92 ≠ amount=114.00 → ligne "35 x 114,00 €" + ligne ajustée à 89,92 €
        RevolvingCalculateResponse resp = parseRevolving("""
                {"productCode":"RESERVE","proposals":[{
                  "dueNumber":36,"annualGlobalEffectiveRate":15.5,"annualDebitRate":14.0,
                  "totalDueAmountWithoutInsurance":4079.92,
                  "installmentWithoutInsurance":{"amount":114.0,"lastAmount":89.92}
                }]}""");

        RepresentativeExample ex = mapper.buildCreditRenouvelable(resp, 3000L, null);

        assertThat(value(ex, K_MONTHLY)).contains("35").contains("114,00 €");
        Row adj = row(ex, K_LAST_ADJ);
        assertThat(adj).isNotNull();
        assertThat(norm(adj.value())).isEqualTo("89,92 €");
        assertThat(adj.labelParam()).isEqualTo("36");
    }

    @Test
    void cr_lastPaymentEqualToAmount_showsSimpleMonthlyAndNoAdjustedLine() throws Exception {
        // lastAmount == amount → pas de "N x amount", pas de ligne ajustée.
        RevolvingCalculateResponse resp = parseRevolving("""
                {"productCode":"RESERVE","proposals":[{
                  "dueNumber":36,"annualGlobalEffectiveRate":15.5,"annualDebitRate":14.0,
                  "totalDueAmountWithoutInsurance":4104.0,
                  "installmentWithoutInsurance":{"amount":114.0,"lastAmount":114.0}
                }]}""");

        RepresentativeExample ex = mapper.buildCreditRenouvelable(resp, 3000L, null);

        assertThat(norm(value(ex, K_MONTHLY))).isEqualTo("114,00 €");
        assertThat(rowOpt(ex, K_LAST_ADJ)).isNull();
    }

    @Test
    void cr_lastPaymentDiffersByLessThanEpsilon_treatedAsEqual() throws Exception {
        // Diff < 0.005 → considérés égaux (AmountFormatter.AMOUNT_EPSILON).
        RevolvingCalculateResponse resp = parseRevolving("""
                {"productCode":"RESERVE","proposals":[{
                  "dueNumber":36,
                  "installmentWithoutInsurance":{"amount":114.000,"lastAmount":114.001}
                }]}""");

        RepresentativeExample ex = mapper.buildCreditRenouvelable(resp, 3000L, null);

        assertThat(norm(value(ex, K_MONTHLY))).isEqualTo("114,00 €");
        assertThat(rowOpt(ex, K_LAST_ADJ)).isNull(); // pas de ligne ajustée
    }

    @Test
    void cr_lastPaymentDiffersByMoreThanEpsilon_treatedAsAdjusted() throws Exception {
        // Diff > 0.005 → considérés différents.
        RevolvingCalculateResponse resp = parseRevolving("""
                {"productCode":"RESERVE","proposals":[{
                  "dueNumber":36,
                  "installmentWithoutInsurance":{"amount":114.00,"lastAmount":114.01}
                }]}""");

        RepresentativeExample ex = mapper.buildCreditRenouvelable(resp, 3000L, null);

        assertThat(rowOpt(ex, K_LAST_ADJ)).isNotNull();
    }

    // ----------------------------------------------------------------- CR : totalDue=1

    @Test
    void cr_totalDueIsOne_doesNotShowNMinus1Format_evenWithAdjustedLast() throws Exception {
        // Cas pathologique : un seul échéancier + last différent. On NE veut PAS afficher "0 x ...".
        // La branche `&& totalDue > 1` du mapper protège contre ça.
        RevolvingCalculateResponse resp = parseRevolving("""
                {"productCode":"RESERVE","proposals":[{
                  "dueNumber":1,
                  "installmentWithoutInsurance":{"amount":114.0,"lastAmount":89.92}
                }]}""");

        RepresentativeExample ex = mapper.buildCreditRenouvelable(resp, 3000L, null);

        String monthly = value(ex, K_MONTHLY);
        assertThat(monthly).doesNotContain(" x ");
        assertThat(norm(monthly)).isEqualTo("114,00 €");
        Row duration = row(ex, K_DURATION);
        assertThat(duration.value()).isEqualTo("1 mois");
    }

    // ----------------------------------------------------------------- CR : dueNumber=0 (edge case)

    @Test
    void cr_dueNumberZero_insuranceDueNumberMinusOneClampedToZero() throws Exception {
        // Math.max(0, dueN - 1) = 0 (pas -1).
        RevolvingCalculateResponse resp = parseRevolving("""
                {"productCode":"RESERVE","proposals":[{
                  "dueNumber":0,
                  "borrowerInsurance":{"insuranceCode":"01","totalInsuranceCost":0.0,
                                        "insuranceInstallment":{"amount":0.0}}
                }]}""");

        RepresentativeExample ex = mapper.buildCreditRenouvelable(resp, 3000L, null);

        Map<String, String> ins = ex.insurance();
        assertThat(ins).containsEntry("dueNumber", "0").containsEntry("dueNumberMinusOne", "0");
    }

    // ----------------------------------------------------------------- CR : assurance partielle

    /**
     * Sans assurance emprunteur, les variables d'ASSURANCE disparaissent — mais celles hors
     * assurance restent. Un exemple représentatif sans assurance facultative doit malgré tout
     * exposer son TAEG et ses mensualités ; les faire dépendre du bloc assurance les aurait fait
     * disparaître silencieusement.
     */
    @Test
    void cr_borrowerInsuranceAbsent_keepsNonInsuranceVariables() throws Exception {
        RevolvingCalculateResponse resp = parseRevolving("""
                {"productCode":"RESERVE","proposals":[{
                  "dueNumber":36,
                  "annualGlobalEffectiveRate":21.15,
                  "annualDebitRate":19.5,
                  "totalAmountWithoutInsurance":3400.0,
                  "installmentWithoutInsurance":{"amount":114.0,"lastAmount":114.0}
                }]}""");

        RepresentativeExample ex = mapper.buildCreditRenouvelable(resp, 3000L, null);

        assertThat(ex.insurance())
                .containsKeys("taeg", "debitRate", "monthlyWithoutInsurance",
                        "lastWithoutInsurance", "totalWithoutInsurance", "dueNumber",
                        "dueNumberMinusOne")
                .doesNotContainKeys("taea", "monthlyAmount", "totalInsuranceCost",
                        "monthlyWithInsurance", "lastWithInsurance");
    }

    @Test
    void cr_partialInsurance_onlyAvailableFieldsInMap() throws Exception {
        // borrowerInsurance présent mais taux et coût total seulement — pas d'installment.
        RevolvingCalculateResponse resp = parseRevolving("""
                {"productCode":"RESERVE","proposals":[{
                  "dueNumber":36,
                  "annualInsuranceEffectiveRate":2.5,
                  "borrowerInsurance":{"insuranceCode":"01","totalInsuranceCost":150.0}
                }]}""");

        RepresentativeExample ex = mapper.buildCreditRenouvelable(resp, 3000L, null);

        Map<String, String> ins = ex.insurance();
        assertThat(ins).containsKeys("taea", "totalInsuranceCost", "dueNumber", "dueNumberMinusOne")
                .doesNotContainKey("monthlyAmount")
                .doesNotContainKey("monthlyWithInsurance");
    }

    @Test
    void cr_insuranceInstallmentWithNullAmount_skippedFromMap() throws Exception {
        // Si l'installment d'assurance est présent mais sans amount, la clé monthlyAmount est absente.
        RevolvingCalculateResponse resp = parseRevolving("""
                {"productCode":"RESERVE","proposals":[{
                  "dueNumber":36,
                  "borrowerInsurance":{"insuranceCode":"01",
                                        "insuranceInstallment":{}}
                }]}""");

        RepresentativeExample ex = mapper.buildCreditRenouvelable(resp, 3000L, null);
        assertThat(ex.insurance()).doesNotContainKey("monthlyAmount");
    }

    // ----------------------------------------------------------------- CR : variant + insurance text override

    @Test
    void cr_insuranceTextOverride_propagatedAsIs() throws Exception {
        RevolvingCalculateResponse resp = parseRevolving("""
                {"productCode":"RESERVE","proposals":[{"dueNumber":36}]}""");

        RepresentativeExample ex = mapper.buildCreditRenouvelable(resp, 3000L, "<p>assurance CR custom</p>");

        assertThat(ex.variant()).isEqualTo(CreditVariant.CREDIT_RENOUVELABLE);
        assertThat(ex.insuranceTextOverride()).isEqualTo("<p>assurance CR custom</p>");
    }

    // ----------------------------------------------------------------- PB / RAC : branches additionnelles

    @Test
    void pb_installmentWithoutInsurance_withNullAmount_skipsMonthlyRow() throws Exception {
        LoanCalculateResponse resp = json.readValue("""
                {"productCode":"PBPERSO","proposals":[{
                  "dueNumber":48,"annualGlobalEffectiveRate":4.9,"annualDebitRate":4.793,
                  "contractFees":0.0,"totalAmountWithoutInsurance":16513.44,
                  "installmentWithoutInsurance":{},
                  "installmentWithInsurance":{"amount":359.78}
                }]}""", LoanCalculateResponse.class);

        RepresentativeExample ex = mapper.buildPretPerso(resp, 15000L, null);

        // Pas de ligne mensualité (installment.amount null), mais le reste est rendu.
        assertThat(rowOpt(ex, K_MONTHLY)).isNull();
        assertThat(row(ex, K_DURATION).value()).isEqualTo("48 mois");
    }

    @Test
    void rac_variantPreservedFromLoanFixture_withoutMutation() throws Exception {
        // Régression : RAC construit directement, pas un PB ré-altéré.
        LoanCalculateResponse resp = json.readValue("""
                {"productCode":"PBPERSO","proposals":[{
                  "dueNumber":48,"annualGlobalEffectiveRate":4.9,"annualDebitRate":4.793,
                  "contractFees":0.0,"totalAmountWithoutInsurance":16513.44,
                  "installmentWithoutInsurance":{"amount":344.03,"lastAmount":344.03}
                }]}""", LoanCalculateResponse.class);

        RepresentativeExample ex = mapper.buildRachatCredit(resp, 15000L, null);
        assertThat(ex.variant()).isEqualTo(CreditVariant.RACHAT_CREDIT);
    }

    // ----------------------------------------------------------------- helpers

    private RevolvingCalculateResponse parseRevolving(String body) throws Exception {
        return json.readValue(body, RevolvingCalculateResponse.class);
    }

    private LoanCalculateResponse parseLoan(String body) throws Exception {
        return json.readValue(body, LoanCalculateResponse.class);
    }

    private static String value(RepresentativeExample ex, String key) {
        Row r = rowOpt(ex, key);
        return r != null ? r.value() : null;
    }

    private static Row row(RepresentativeExample ex, String key) {
        Row r = rowOpt(ex, key);
        if (r == null) {
            throw new AssertionError("Row '" + key + "' attendue mais absente");
        }
        return r;
    }

    // ----------------------------------------------------------------- PB : réponse APIM réelle

    /**
     * Jeu COMPLET de variables sur une réponse de production (PRÊT PERSONNEL, 15 000 € / 48 mois).
     *
     * <p>Verrouille les valeurs formatées, pas seulement la présence des clés : c'est ce qui
     * détecterait qu'un champ a changé de source dans l'APIM — un {@code totalWithoutInsurance}
     * branché par erreur sur {@code totalCostWithoutInsurance} donnerait 1 451,52 € au lieu de
     * 16 451,52 €, et aucune assertion de présence ne le verrait.
     */
    @Test
    void pb_realApimPayload_exposesEveryVariable() throws Exception {
        LoanCalculateResponse resp = parseLoan("""
                {"capitalAmount":15000.0,"label":"PRÊT PERSONNEL","productCode":"PBPERSO ",
                 "campaignCode":"NEOURL41","proposals":[{
                  "loanDuration":48,"dueNumber":48,"scaleCode":"CRBP0000",
                  "annualDebitRate":4.602,"annualGlobalEffectiveRate":4.7,
                  "annualInsuranceEffectiveRate":2.421,"contractFees":0.0,
                  "totalAmountWithoutInsurance":16451.52,"totalAmountWithInsurance":17207.52,
                  "installmentWithoutInsurance":{"amount":342.74,"firstAmount":342.74,"lastAmount":342.74},
                  "installmentWithInsurance":{"amount":358.49,"firstAmount":358.49,"lastAmount":358.49},
                  "borrowerInsurance":{"insuranceCode":"01","totalInsuranceCost":756.0,
                    "insuranceInstallment":{"amount":15.75,"firstAmount":15.75,"lastAmount":15.75}}
                 }]}""");

        Map<String, String> vars = mapper.buildPretPerso(resp, 15000L, null).insurance();

        // Hors assurance — le volet que l'ancien site utilisait et qui manquait.
        // Trois décimales : `formatPercent` applique le motif "0.000", comme pour les lignes
        // du tableau. Les jetons et le tableau affichent donc le même taux, au même format.
        assertThat(norm(vars.get("taeg"))).isEqualTo("4,700 %");
        assertThat(norm(vars.get("debitRate"))).isEqualTo("4,602 %");
        assertThat(norm(vars.get("monthlyWithoutInsurance"))).isEqualTo("342,74 €");
        assertThat(norm(vars.get("lastWithoutInsurance"))).isEqualTo("342,74 €");
        assertThat(norm(vars.get("totalWithoutInsurance"))).isEqualTo("16 451,52 €");
        assertThat(norm(vars.get("totalWithInsurance"))).isEqualTo("17 207,52 €");

        // Assurance — volet déjà couvert, non régressé.
        assertThat(norm(vars.get("taea"))).isEqualTo("2,421 %");
        assertThat(norm(vars.get("monthlyAmount"))).isEqualTo("15,75 €");
        assertThat(norm(vars.get("firstMonthlyAmount"))).isEqualTo("15,75 €");
        assertThat(norm(vars.get("totalInsuranceCost"))).isEqualTo("756,00 €");
        assertThat(norm(vars.get("monthlyWithInsurance"))).isEqualTo("358,49 €");
        assertThat(norm(vars.get("lastWithInsurance"))).isEqualTo("358,49 €");

        assertThat(vars).containsEntry("dueNumber", "48").containsEntry("dueNumberMinusOne", "47");
    }

    // ----------------------------------------------------------------- CR : première prime

    /**
     * La PREMIÈRE prime est distincte de la prime courante.
     *
     * <p>Sur un crédit renouvelable la prime d'assurance se calcule sur le solde restant dû :
     * elle décroît, et la première est la plus élevée. Le payload est ici volontairement
     * DÉSACCORDÉ ({@code amount} ≠ {@code firstAmount}) — sur les réponses APIM observées les deux
     * coïncident, et un test bâti dessus ne prouverait rien.
     */
    @Test
    void cr_firstInsurancePremium_isDistinctFromTheCurrentOne() throws Exception {
        RevolvingCalculateResponse resp = parseRevolving("""
                {"productCode":"RESERVE","proposals":[{
                  "dueNumber":36,
                  "borrowerInsurance":{"insuranceCode":"01","totalInsuranceCost":420.6,
                    "insuranceInstallment":{"amount":18.40,"firstAmount":20.14,"lastAmount":12.05}}
                 }]}""");

        Map<String, String> vars = mapper.buildCreditRenouvelable(resp, 3000L, null).insurance();

        assertThat(norm(vars.get("firstMonthlyAmount"))).isEqualTo("20,14 €");
        assertThat(norm(vars.get("monthlyAmount"))).isEqualTo("18,40 €");
    }

    /** `firstAmount` absent : le jeton disparaît plutôt que de retomber sur la prime courante. */
    @Test
    void cr_firstAmountMissing_doesNotFallBackToTheCurrentPremium() throws Exception {
        RevolvingCalculateResponse resp = parseRevolving("""
                {"productCode":"RESERVE","proposals":[{
                  "dueNumber":36,
                  "borrowerInsurance":{"insuranceCode":"01",
                    "insuranceInstallment":{"amount":18.40}}
                 }]}""");

        Map<String, String> vars = mapper.buildCreditRenouvelable(resp, 3000L, null).insurance();

        assertThat(vars).doesNotContainKey("firstMonthlyAmount");
        assertThat(norm(vars.get("monthlyAmount"))).isEqualTo("18,40 €");
    }

    private static Row rowOpt(RepresentativeExample ex, String key) {
        List<Row> rows = ex.rows();
        if (rows == null) {
            return null;
        }
        for (Row r : rows) {
            if (key.equals(r.labelKey())) {
                return r;
            }
        }
        return null;
    }

    /** Normalise les espaces insécables / autres espaces Unicode en ASCII pour les assertions. */
    private static String norm(String s) {
        return s == null ? null : s.replace('\u00A0', ' ').replace('\u202F', ' ');
    }
}
