package ch.sofinco.core.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;

/**
 * Formatage des montants et taux pour l'affichage français (séparateur de milliers espace
 * insécable, virgule décimale).
 *
 * <p>Extrait de {@code RepresentativeExampleServiceImpl} pour casser la God Class et rendre le
 * formatage testable indépendamment.
 *
 * <h2>Locale arbitrage</h2>
 *
 * <p>Décision arbitrée : <b>{@link Locale#FRENCH} explicitement choisi pour le formatage
 * d'affichage</b> (séparateurs FR). {@link Locale#ROOT} est utilisé uniquement pour les opérations
 * de comparaison de chaînes (case-conversion sécurisée anti Turkish-i — appliquée dans
 * {@code CreditVariant} / {@code MockApimSimulationClient}, pas ici). Les deux concerns sont
 * distincts : formatage = présentation locale ; sécurité = invariant ROOT.
 *
 * <h2>BigDecimal vs double</h2>
 *
 * <p>L'overload {@link #formatEuros(BigDecimal)} applique {@code setScale(2, HALF_UP)} en amont
 * pour garantir la précision financière (pas de perte IEEE-754 sur 0,01 €). À privilégier sur
 * {@link #formatEuros(Number)} dès qu'on a un {@link BigDecimal} en main.
 *
 * <h2>RoundingMode</h2>
 *
 * <p>{@link RoundingMode#HALF_UP} (arrondi commercial) explicite — {@code DecimalFormat} utilise
 * {@code HALF_EVEN} (banker's rounding) par défaut, comportement inattendu en affichage financier
 * FR (ex. {@code 0,005 € → "0,00"} avec HALF_EVEN, devrait afficher {@code "0,01"}).
 */
public final class AmountFormatter {

    /** Placeholder affiché quand une valeur numérique est absente. */
    public static final String MISSING = "-";

    /** Demi-centime : seuil de différence € (évite Double.equals bruit IEEE-754 / -0.0 vs 0.0). */
    public static final double AMOUNT_EPSILON = 0.005d;

    /** Échelle décimale euro (2 décimales). */
    private static final int EURO_SCALE = 2;

    private static final String EURO_SUFFIX = " €";
    private static final String PERCENT_SUFFIX = " %";

    private AmountFormatter() {
        // util statique
    }

    /**
     * Montant à décimales VARIABLES : {@code 3001.0 → "3 001 €"}, {@code 3001.5 → "3 001,50 €"}.
     *
     * <p>Destiné aux BORNES D'OFFRE — montants minimum et maximum d'une campagne — que l'ancien
     * site rendait déjà sans décimales ({@code currency(..., NO_DECIMAL)} dans
     * {@code offer.composable.ts}). Une mention annonçant « pour un montant de 3 001,00 € à
     * 75 000,00 € » alourdit une phrase dont ces zéros ne disent rien.
     *
     * <p><b>Variable et non « sans décimales ».</b> Fixer zéro décimale masquerait des centimes si
     * l'APIM en renvoyait un jour : une borne réglementaire affichée « à partir de 3 001 € » alors
     * que le minimum réel est 3 001,50 € annoncerait au visiteur un seuil qui n'existe pas. On
     * n'omet donc que ce qui ne porte aucune information.
     *
     * <p><b>À NE PAS employer pour les LIGNES d'un exemple représentatif</b> — mensualités, frais
     * de dossier, coût total. Celles-là sont alignées dans un même bloc réglementaire, et une
     * ligne à « 90 € » au milieu de lignes à « 87,80 € » se lit comme une valeur d'une autre
     * nature.
     *
     * <p><b>Exception : {@code exampleAmount}.</b> Le montant emprunté de tête ne vit pas dans ce
     * bloc aligné — il ouvre une phrase (« Pour un prêt de 15 000 € sur 36 mois… ») et alimente
     * `substitutePlaceholders`. Il utilise donc la forme adaptative, conformément à l'affichage
     * de l'ancien site. Les lignes du bloc, elles, restent sur {@link #formatEuros}.
     */
    public static String formatEurosAdaptive(Number value) {
        if (value == null) {
            return MISSING;
        }
        double amount = value.doubleValue();
        boolean whole = Math.abs(amount - Math.rint(amount)) < AMOUNT_EPSILON;
        return decimalFormat(whole ? "#,##0" : "#,##0.00").format(amount) + EURO_SUFFIX;
    }

    /** Ex. {@code 15000.0 → "15 000,00 €"}, {@code null → "-"}. */
    public static String formatEuros(Number value) {
        if (value == null) {
            return MISSING;
        }
        return decimalFormat("#,##0.00").format(value.doubleValue()) + EURO_SUFFIX;
    }

    /**
     * Surcharge {@link BigDecimal} pour précision financière stricte. Applique
     * {@link BigDecimal#setScale(int, RoundingMode) setScale(2, HALF_UP)} avant formatage,
     * évite toute conversion lossy {@code BigDecimal → double} sur des montants critiques
     * (acomptes, totaux dus, frais de dossier). À privilégier dès qu'un {@link BigDecimal} est
     * disponible.
     *
     * @param value montant € ({@code null} → {@value #MISSING})
     * @return ex. {@code BigDecimal("344.035") → "344,04 €"} (HALF_UP)
     */
    public static String formatEuros(BigDecimal value) {
        if (value == null) {
            return MISSING;
        }
        BigDecimal scaled = value.setScale(EURO_SCALE, RoundingMode.HALF_UP);
        return decimalFormat("#,##0.00").format(scaled) + EURO_SUFFIX;
    }

    /** Ex. {@code 4.9 → "4,900 %"}, {@code null → "-"}. */
    public static String formatPercent(Number value) {
        if (value == null) {
            return MISSING;
        }
        return decimalFormat("0.000").format(value.doubleValue()) + PERCENT_SUFFIX;
    }

    /** Conversion null-safe {@code Integer → int} (0 si null). */
    public static int safeInt(Integer i) {
        return i == null ? 0 : i;
    }

    /**
     * {@code true} si deux montants € diffèrent d'au moins un demi-centime
     * ({@link #AMOUNT_EPSILON}). Plus robuste qu'un {@code .equals()} direct sur {@link Double}
     * (qui est strict IEEE-754 et casse sur {@code 114.00000000001} vs {@code 114.0}).
     * {@code null} sur l'un des deux opérandes → {@code false}.
     */
    public static boolean amountsDiffer(Double a, Double b) {
        if (a == null || b == null) {
            return false;
        }
        return Math.abs(a - b) > AMOUNT_EPSILON;
    }

    private static DecimalFormat decimalFormat(String pattern) {
        var symbols = DecimalFormatSymbols.getInstance(Locale.FRENCH);
        var df = new DecimalFormat(pattern, symbols);
        df.setRoundingMode(RoundingMode.HALF_UP);
        return df;
    }
}
