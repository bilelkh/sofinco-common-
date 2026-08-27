package ch.sofinco.core.util;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class AmountFormatterTest {

    @Test
    void formatEuros_formatsFrenchLocaleWithGroupingAndComma() {
        // La locale FR utilise une espace insécable (U+202F/U+00A0) comme séparateur
        // de milliers ; on normalise pour la lisibilité de l'assertion.
        assertThat(norm(AmountFormatter.formatEuros(15000.0))).isEqualTo("15 000,00 €");
        assertThat(norm(AmountFormatter.formatEuros(344.03))).isEqualTo("344,03 €");
        assertThat(norm(AmountFormatter.formatEuros(0.0))).isEqualTo("0,00 €");
    }

    @Test
    void formatEuros_returnsPlaceholderOnNull() {
        assertThat(AmountFormatter.formatEuros(null)).isEqualTo(AmountFormatter.MISSING);
    }

    @Test
    void formatPercent_formatsThreeDecimals() {
        assertThat(AmountFormatter.formatPercent(4.9)).isEqualTo("4,900 %");
        assertThat(AmountFormatter.formatPercent(23.5)).isEqualTo("23,500 %");
    }

    @Test
    void formatPercent_returnsPlaceholderOnNull() {
        assertThat(AmountFormatter.formatPercent(null)).isEqualTo("-");
    }

    @Test
    void safeInt_isNullSafe() {
        assertThat(AmountFormatter.safeInt(null)).isZero();
        assertThat(AmountFormatter.safeInt(36)).isEqualTo(36);
    }

    @Test
    void formatEuros_bigDecimal_appliesHalfUpAtTwoDecimals() {
        // Surcharge BigDecimal : précision financière, HALF_UP explicite, pas de conversion lossy.
        assertThat(norm(AmountFormatter.formatEuros(new BigDecimal("344.035"))))
                .isEqualTo("344,04 €"); // .035 → arrondi sup HALF_UP
        assertThat(norm(AmountFormatter.formatEuros(new BigDecimal("0.005"))))
                .isEqualTo("0,01 €");
        assertThat(norm(AmountFormatter.formatEuros(new BigDecimal("15000"))))
                .isEqualTo("15 000,00 €");
    }

    @Test
    void formatEuros_bigDecimal_returnsPlaceholderOnNull() {
        assertThat(AmountFormatter.formatEuros((BigDecimal) null)).isEqualTo(AmountFormatter.MISSING);
    }

    /** Remplace les espaces insécables (fine U+202F ou normale U+00A0) par une espace ASCII. */
    static String norm(String s) {
        return s == null ? null : s.replace((char) 0x202f, ' ').replace((char) 0x00a0, ' ');
    }

    // ------------------------------------------------------------------ format adaptatif

    /**
     * DÉCIMALES VARIABLES — réservé au CAPITAL et aux BORNES d'offre.
     *
     * <p>Alignement sur l'ancien site, qui rendait déjà ces montants sans décimales
     * ({@code currency(..., NO_DECIMAL)}). « pour un montant de 3 001,00 € à 75 000,00 € »
     * s'alourdit de zéros qui ne portent aucune information.
     *
     * <p>Les valeurs CALCULÉES — mensualités, coût total — gardent leurs centimes et passent donc
     * par {@link AmountFormatter#formatEuros(Number)}, pas par cette variante.
     */
    @Test
    void adaptive_dropsTheDecimalsOnWholeAmounts() {
        assertThat(norm(AmountFormatter.formatEurosAdaptive(15000L))).isEqualTo("15 000 €");
        assertThat(norm(AmountFormatter.formatEurosAdaptive(3001.0))).isEqualTo("3 001 €");
    }

    /**
     * La contrepartie, et c'est elle qui interdit de fixer zéro décimale : un montant à centimes
     * les CONSERVE. Annoncer « à partir de 3 001 € » quand le minimum réel vaut 3 001,50 €
     * afficherait un seuil réglementaire qui n'existe pas.
     */
    @Test
    void adaptive_keepsTheCentsWhenThereAreSome() {
        assertThat(norm(AmountFormatter.formatEurosAdaptive(3001.5))).isEqualTo("3 001,50 €");
        assertThat(norm(AmountFormatter.formatEurosAdaptive(87.8))).isEqualTo("87,80 €");
    }

    /** Une valeur absente ne devient pas « 0 € » : ce serait un montant, donc une information fausse. */
    @Test
    void adaptive_rendersNullAsMissing() {
        assertThat(AmountFormatter.formatEurosAdaptive(null))
                .isEqualTo(AmountFormatter.formatEuros((Number) null));
    }
}
