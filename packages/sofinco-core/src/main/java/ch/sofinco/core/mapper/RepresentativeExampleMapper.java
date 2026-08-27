package ch.sofinco.core.mapper;

import ch.sofinco.core.enums.CreditVariant;
import ch.sofinco.core.model.representativeexample.CommonProposal;
import ch.sofinco.core.model.representativeexample.Installment;
import ch.sofinco.core.model.representativeexample.InsuranceProposal;
import ch.sofinco.core.model.representativeexample.LoanCalculateResponse;
import ch.sofinco.core.model.representativeexample.LoanProposal;
import ch.sofinco.core.model.representativeexample.RepresentativeExample;
import ch.sofinco.core.model.representativeexample.RevolvingCalculateResponse;
import ch.sofinco.core.model.representativeexample.RevolvingProposal;
import ch.sofinco.core.model.representativeexample.Row;
import ch.sofinco.core.util.AmountFormatter;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Transforme une réponse APIM (loan ou revolving) en {@link RepresentativeExample}.
 *
 * <p>Classe <b>pure</b> (aucune I/O, aucun JCR, aucun HTTP) : cible de tests unitaires
 * principale. Chaque {@code build*} accumule lignes et map d'assurance dans des collections
 * locales puis construit le record résultat (aucune mutation post-construction).
 *
 * <p>Le {@code contractFees} (loan-only) est accessible uniquement via {@link LoanProposal}
 * — la type-safety empêche un usage erroné depuis du revolving.
 *
 * <p>Différence d'affichage des mensualités :
 * <ul>
 *   <li>PB / RAC : mensualités égales → affichage simple "344,03 €"</li>
 *   <li>CR : dernière mensualité ajustée → "N x amount" (ex. "35 x 114,00 €") + ligne séparée
 *       "Ne mensualité ajustée*" avec le montant ajusté</li>
 * </ul>
 *
 * <p>Comparaison de montants : via {@link AmountFormatter#amountsDiffer(Double, Double)} avec
 * epsilon demi-centime — plus robuste qu'un {@code .equals()} strict IEEE-754.
 */
public class RepresentativeExampleMapper {

    private static final String LABEL_MONTHLY_PAYMENT      = "representativeExample.row.monthlyPayment";
    private static final String LABEL_LAST_PAYMENT_ADJ     = "representativeExample.row.lastPaymentAdjusted";
    private static final String LABEL_DURATION             = "representativeExample.row.duration";
    private static final String LABEL_TAEG_FIXED           = "representativeExample.row.taegFixed";
    private static final String LABEL_TAEG_REVISABLE       = "representativeExample.row.taegRevisable";
    private static final String LABEL_DEBIT_RATE_FIXED     = "representativeExample.row.debitRateFixed";
    private static final String LABEL_DEBIT_RATE_REVISABLE = "representativeExample.row.debitRateRevisable";
    private static final String LABEL_FILE_FEES            = "representativeExample.row.fileFees";
    private static final String LABEL_TOTAL_DUE            = "representativeExample.row.totalDue";

    private static final String MONTHS_SUFFIX = " mois";
    private static final String TIMES_SEPARATOR = " x ";

    /** Construit l'exemple PB (Prêt Personnel). */
    public RepresentativeExample buildPretPerso(LoanCalculateResponse resp,
                                                long amount, String insuranceTextOverride) {
        return buildLoan(resp, amount, insuranceTextOverride, CreditVariant.PRET_PERSO);
    }

    /** Construit l'exemple RAC (Rachat de Crédit) — même structure que PB, variante différente. */
    public RepresentativeExample buildRachatCredit(LoanCalculateResponse resp,
                                                   long amount, String insuranceTextOverride) {
        return buildLoan(resp, amount, insuranceTextOverride, CreditVariant.RACHAT_CREDIT);
    }

    private RepresentativeExample buildLoan(LoanCalculateResponse resp, long amount,
                                            String insuranceTextOverride, CreditVariant variant) {
        // Le service filtre en amont (firstProposal() == null → Optional.empty) ; on rend cette
        // précondition explicite plutôt que de laisser un NPE nu surgir dix lignes plus bas.
        LoanProposal p = requireProposal(resp.firstProposal());
        var withIns = p.installmentWithInsurance();
        var withoutIns = p.installmentWithoutInsurance();
        var totalDue = AmountFormatter.safeInt(p.dueNumber());

        List<Row> rows = new ArrayList<>();
        // La ligne "Mensualités" est conditionnée à la SOURCE de sa valeur
        // (installmentWithoutInsurance), sinon elle disparaissait quand l'échéance assurée manquait.
        if (withoutIns != null && withoutIns.amount() != null) {
            rows.add(new Row(LABEL_MONTHLY_PAYMENT, AmountFormatter.formatEuros(withoutIns.amount())));
        }
        rows.add(Row.parameterized(LABEL_DURATION, totalDue + MONTHS_SUFFIX,
                String.valueOf(totalDue)));
        rows.add(new Row(LABEL_TAEG_FIXED, AmountFormatter.formatPercent(p.annualGlobalEffectiveRate())));
        rows.add(new Row(LABEL_DEBIT_RATE_FIXED, AmountFormatter.formatPercent(p.annualDebitRate())));
        // contractFees est loan-spécifique — type-safety garantie par LoanProposal.
        rows.add(new Row(LABEL_FILE_FEES, AmountFormatter.formatEuros(p.contractFees())));
        rows.add(Row.highlighted(LABEL_TOTAL_DUE, AmountFormatter.formatEuros(p.totalAmountWithoutInsurance())));

        return new RepresentativeExample(variant, resp.productCodeTrimmed(),
                AmountFormatter.formatEurosAdaptive(amount), rows, buildInsuranceMap(p, withIns),
                insuranceTextOverride);
    }

    /** Construit l'exemple CR (Crédit Renouvelable) avec ses formats spécifiques. */
    public RepresentativeExample buildCreditRenouvelable(RevolvingCalculateResponse resp,
                                                         long amount, String insuranceTextOverride) {
        RevolvingProposal p = requireProposal(resp.firstProposal());
        var withIns = p.installmentWithInsurance();
        var withoutIns = p.installmentWithoutInsurance();
        var totalDue = AmountFormatter.safeInt(p.dueNumber());

        List<Row> rows = new ArrayList<>();
        // Mensualité CR : "N x montant" si dernière échéance différente, sinon affichage simple.
        if (withoutIns != null && withoutIns.amount() != null) {
            boolean hasAdjustedLast = hasAdjustedLastPayment(withoutIns) && totalDue > 1;
            String monthlyDisplay = hasAdjustedLast
                    ? (totalDue - 1) + TIMES_SEPARATOR + AmountFormatter.formatEuros(withoutIns.amount())
                    : AmountFormatter.formatEuros(withoutIns.amount());
            rows.add(new Row(LABEL_MONTHLY_PAYMENT, monthlyDisplay));
        }
        // Dernière mensualité ajustée (CR uniquement) ; labelParam = dueNumber pour {{mois}}.
        if (hasAdjustedLastPayment(withoutIns)) {
            rows.add(Row.parameterized(LABEL_LAST_PAYMENT_ADJ,
                    AmountFormatter.formatEuros(withoutIns.lastAmount()),
                    String.valueOf(totalDue)));
        }
        rows.add(Row.parameterized(LABEL_DURATION, totalDue + MONTHS_SUFFIX,
                String.valueOf(totalDue)));
        rows.add(new Row(LABEL_TAEG_REVISABLE, AmountFormatter.formatPercent(p.annualGlobalEffectiveRate())));
        rows.add(new Row(LABEL_DEBIT_RATE_REVISABLE, AmountFormatter.formatPercent(p.annualDebitRate())));
        // Pas de ligne "Frais de dossier" pour le CR (structurellement 0,00 €).
        rows.add(Row.highlighted(LABEL_TOTAL_DUE, AmountFormatter.formatEuros(p.totalAmountWithoutInsurance())));

        return new RepresentativeExample(CreditVariant.CREDIT_RENOUVELABLE, resp.productCodeTrimmed(),
                AmountFormatter.formatEurosAdaptive(amount), rows, buildInsuranceMap(p, withIns),
                insuranceTextOverride);
    }

    /**
     * Une réponse APIM sans proposition n'est pas mappable : il n'y a ni mensualité, ni taux, ni
     * total à afficher. L'appelant ({@code RepresentativeExampleServiceImpl}) l'écarte déjà en
     * amont ; cette garde transforme un éventuel oubli en échec nommé au lieu d'un
     * {@code NullPointerException} sans message au milieu du mapping.
     */
    private static <T extends CommonProposal> T requireProposal(T proposal) {
        return Objects.requireNonNull(proposal,
                "réponse APIM sans proposition : à filtrer avant appel au mapper");
    }

    /**
     * {@code true} si la dernière échéance diffère de l'échéance courante d'au moins un
     * demi-centime ({@link AmountFormatter#AMOUNT_EPSILON}). Plus robuste qu'un
     * {@code .equals()} strict sur {@link Double}.
     */
    private static boolean hasAdjustedLastPayment(Installment inst) {
        return inst != null
                && AmountFormatter.amountsDiffer(inst.lastAmount(), inst.amount());
    }

    /**
     * Peuple la map de VARIABLES partagée par les 3 variants — les valeurs que le TypeScript
     * expose comme jetons {@code {{…}}} dans les textes contributeur. Travaille sur le type commun
     * {@link CommonProposal} : accepte indifféremment {@link LoanProposal} et
     * {@link RevolvingProposal}. Visible package pour tests.
     *
     * <p><b>Deux blocs, et l'ordre compte.</b> Les valeurs HORS assurance (TAEG, taux débiteur,
     * mensualités et totaux sans assurance) sont produites en premier, <i>avant</i> le retour
     * anticipé sur absence d'assurance emprunteur : un exemple représentatif sans assurance
     * facultative doit malgré tout exposer son TAEG et ses mensualités. Les inclure dans le bloc
     * assurance les aurait fait disparaître dans ce cas — silencieusement.
     *
     * <p>Ces valeurs étaient déjà calculées pour les lignes du tableau ({@code rows}) ; elles sont
     * ici exposées en plus comme jetons, sans aucun appel APIM supplémentaire. Elles couvrent le
     * vocabulaire de l'ancien site, où la substitution avait lieu côté simulateur Vue.
     *
     * <p>Noms CANONIQUES, symétriques deux à deux ({@code monthlyWithInsurance} /
     * {@code monthlyWithoutInsurance}, {@code totalWithInsurance} / {@code totalWithoutInsurance}).
     * Les noms hérités de l'ancien site — {@code monthlyAmountNonInsurance},
     * {@code totalAmountNonInsurance}, {@code annualDebitRate}… — sont traités comme alias côté
     * TypeScript ({@code LEGACY_ALIASES} dans {@code src/lib/insuranceVars.ts}), jamais ici.
     */
    static Map<String, String> buildInsuranceMap(CommonProposal p, Installment withIns) {
        Map<String, String> vars = new LinkedHashMap<>();

        // --- Hors assurance : toujours présent, même sans assurance emprunteur ---------------
        putPercent(vars, "taeg", p.annualGlobalEffectiveRate());
        putPercent(vars, "debitRate", p.annualDebitRate());
        var withoutIns = p.installmentWithoutInsurance();
        putEuros(vars, "monthlyWithoutInsurance", amountOf(withoutIns));
        putEuros(vars, "lastWithoutInsurance", lastAmountOf(withoutIns));
        putEuros(vars, "totalWithoutInsurance", p.totalAmountWithoutInsurance());
        putEuros(vars, "totalWithInsurance", p.totalAmountWithInsurance());
        Integer dueN = p.dueNumber();
        if (dueN != null) {
            vars.put("dueNumber", String.valueOf(dueN));
            vars.put("dueNumberMinusOne", String.valueOf(Math.max(0, dueN - 1)));
        }

        // --- Assurance emprunteur : absente sur une offre sans assurance facultative ---------
        InsuranceProposal ins = p.borrowerInsurance();
        if (ins == null) {
            return vars;
        }
        var insI = ins.insuranceInstallment();
        putEuros(vars, "monthlyAmount", amountOf(insI));
        /*
         * PREMIÈRE prime, distincte de la prime courante. Sur un crédit renouvelable la prime
         * d'assurance se calcule sur le solde restant dû : elle décroît, et la première est donc
         * la plus élevée — c'est la formulation consacrée des mentions (« la première prime est
         * la plus élevée soit X »).
         *
         * L'APIM renvoie aujourd'hui `amount` et `firstAmount` égaux, mais ce sont deux champs
         * de sens différent. L'alias historique `firstMonthlyInsuranceAmountT1` pointait sur
         * `monthlyAmount`, donc sur `amount` : le nom promettait la première prime, le code
         * livrait la courante. Le jour où l'APIM les distinguera — ce qui est le propre d'une
         * prime dégressive — la phrase afficherait un chiffre faux, sans que rien ne le signale.
         */
        putEuros(vars, "firstMonthlyAmount", firstAmountOf(insI));
        putPercent(vars, "taea", p.annualInsuranceEffectiveRate());
        putEuros(vars, "totalInsuranceCost", ins.totalInsuranceCost());
        putEuros(vars, "monthlyWithInsurance", amountOf(withIns));
        putEuros(vars, "lastWithInsurance", lastAmountOf(withIns));
        return vars;
    }

    // ── Écritures conditionnelles : un jeton absent de la map n'est pas substitué côté TS,
    //    une valeur nulle formatée le serait à tort en « 0 € ». D'où le filtrage à la source.

    private static void putEuros(Map<String, String> vars, String key, Double value) {
        if (value != null) {
            vars.put(key, AmountFormatter.formatEuros(value));
        }
    }

    private static void putPercent(Map<String, String> vars, String key, Number value) {
        if (value != null) {
            vars.put(key, AmountFormatter.formatPercent(value));
        }
    }

    private static Double amountOf(Installment installment) {
        return installment != null ? installment.amount() : null;
    }

    private static Double firstAmountOf(Installment installment) {
        return installment != null ? installment.firstAmount() : null;
    }

    private static Double lastAmountOf(Installment installment) {
        return installment != null ? installment.lastAmount() : null;
    }
}
