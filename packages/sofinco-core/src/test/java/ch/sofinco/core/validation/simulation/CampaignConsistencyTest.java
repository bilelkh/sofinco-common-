package ch.sofinco.core.validation.simulation;

import ch.sofinco.core.model.representativeexample.CampaignResponse;
import ch.sofinco.core.model.representativeexample.SimulationParams;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Règles de cohérence entre la saisie du contributeur et l'enveloppe réelle de l'offre.
 *
 * <p>La campagne de référence est celle relevée en production sur {@code NEOURL41} — 3 001 € à
 * 75 000 €, 12 à 120 mois, « PRÊT PERSONNEL ». Des bornes inventées ne diraient rien des cas
 * réellement rencontrés.
 */
class CampaignConsistencyTest {

    /** Prêt Personnel : 3 001 € à 75 000 €, 12 à 120 mois. */
    private static CampaignResponse pretPerso() {
        return campaign("NEOURL41", "loan", "PRÊT PERSONNEL", 3001.0, 75000.0, 12, 120);
    }

    private static CampaignResponse campaign(String id, String type, String label,
                                             Double minAmount, Double maxAmount,
                                             Integer minDuration, Integer maxDuration) {
        return new CampaignResponse(id, type, label, minAmount, maxAmount,
                minDuration, maxDuration, null, null, null, null, null, null, null);
    }

    private static List<CampaignConsistency.Violation> check(String product, Long amount, Long duration) {
        return CampaignConsistency.check(product, amount, duration, pretPerso());
    }

    // ------------------------------------------------------------------ defauts de site

    /**
     * LES DEFAUTS DE SITE DOIVENT RESTER VALIDES POUR LES TROIS PRODUITS.
     *
     * <p>`defaultAmount` / `defaultDuration` de {@code sofnt:representativeExampleConfig} —
     * repliques dans {@code RepresentativeExampleServiceImpl} — s'appliquent a toute page qui
     * ne fixe pas ses propres valeurs, QUEL QUE SOIT le produit. Une valeur hors bornes y
     * produirait un exemple representatif refuse par l'APIM, donc une mention reglementee
     * amputee de ses chiffres — en silence, puisque aucune saisie contributeur n'est en cause.
     *
     * <p>Le couple 5 000 EUR / 48 mois est le seul rond qui tienne dans les trois enveloppes
     * relevees en production. C'est ce qui a fait ecarter 3 000 (sous le plancher PB et RAC) et
     * 15 000 (au-dessus du plafond CR). Ce test le fige : toucher a ces defauts sans verifier
     * les trois produits echouera ici.
     */
    @ParameterizedTest(name = "{0} : les defauts de site tiennent dans l''enveloppe")
    @CsvSource({
            // produit, libelle,             minAmount, maxAmount, minDuration, maxDuration
            "CR,  CREDIT RENOUVELABLE,       150,       10000,     10,          60",
            "PB,  PRET PERSONNEL,            3001,      75000,     12,          120",
            "RAC, RACHAT DE CREDITS,         3001,      100000,    36,          120",
    })
    void siteDefaultsStayValidForEveryProduct(String product, String label,
                                              double minAmount, double maxAmount,
                                              int minDuration, int maxDuration) {
        long defaultAmount = 5000L;
        long defaultDuration = 48L;

        var offer = campaign("NEOURL", product.equals("CR") ? "revolving" : "loan", label,
                minAmount, maxAmount, minDuration, maxDuration);

        assertThat(CampaignConsistency.check(product, defaultAmount, defaultDuration, offer))
                .as("%s : %d EUR / %d mois doivent rester acceptes", product,
                        defaultAmount, defaultDuration)
                .isEmpty();
    }

    // ------------------------------------------------------------------ neutralité

    @Test
    void aCoherentEntry_producesNoViolation() {
        assertThat(check("PB", 15000L, 48L)).isEmpty();
    }

    @Test
    void aNullCampaign_producesNoViolation() {
        assertThat(CampaignConsistency.check("PB", 1L, 1L, null)).isEmpty();
    }

    /**
     * Une valeur absente n'est PAS signalée ici : son caractère obligatoire relève du validateur.
     * La signaler deux fois noierait le message utile sous un doublon.
     */
    @Test
    void missingValues_areNotReportedTwice() {
        assertThat(CampaignConsistency.check(null, null, null, pretPerso())).isEmpty();
    }

    /** Campagne amputée de ses bornes : rien à comparer, donc rien à refuser. */
    @Test
    void aCampaignWithoutBounds_producesNoViolation() {
        CampaignResponse partial = campaign("X", "loan", "PRÊT PERSONNEL", null, null, null, null);
        assertThat(CampaignConsistency.check("PB", 999999L, 999L, partial)).isEmpty();
    }

    // ------------------------------------------------------------------ type de crédit

    @ParameterizedTest
    @CsvSource({
            "NEOURL41, loan,      PRÊT PERSONNEL,      PB",
            "NEOURL02, revolving, CRÉDIT RENOUVELABLE, CR",
            "NEOURL99, loan,      RACHAT DE CRÉDITS,   RAC",
    })
    void theProductIsDeducedFromTheLabel(String id, String type, String label, String product) {
        CampaignResponse c = campaign(id, type, label, null, null, null, null);

        assertThat(CampaignConsistency.check(product, null, null, c))
                .as("le type saisi correspond au libellé de la campagne")
                .isEmpty();
    }

    @Test
    void aProductContradictingTheLabel_isRejectedOnTheRightField() {
        List<CampaignConsistency.Violation> violations = check("CR", null, null);

        assertThat(violations).singleElement()
                .satisfies(v -> {
                    assertThat(v.property()).isEqualTo(SimulationParams.PROP_PRODUCT);
                    assertThat(v.message()).contains("NEOURL41").contains("PB");
                });
    }

    /**
     * Casse, accents et espaces multiples désignent le même produit. Comparer les chaînes brutes
     * ferait refuser une saisie correcte — le pire résultat possible pour un contrôle de saisie.
     */
    @ParameterizedTest
    @ValueSource(strings = {"PRÊT PERSONNEL", "pret personnel", "Prêt  Personnel", "  PRET PERSONNEL  "})
    void labelComparisonIgnoresCaseAccentsAndSpacing(String label) {
        CampaignResponse c = campaign("X", "loan", label, null, null, null, null);
        assertThat(CampaignConsistency.check("PB", null, null, c)).isEmpty();
    }

    /**
     * LE garde-fou contre une dénomination marketing modifiée. Un libellé inconnu sur un endpoint
     * {@code loan} ne permet pas de séparer PB de RAC : on n'exige donc rien, plutôt que de geler
     * la contribution du site en attendant une livraison.
     */
    @ParameterizedTest
    @ValueSource(strings = {"PB", "RAC"})
    void anUnknownLabelOnALoan_blocksNothing(String product) {
        CampaignResponse renamed = campaign("X", "loan", "PRÊT PERSO NOUVELLE FORMULE",
                null, null, null, null);
        assertThat(CampaignConsistency.check(product, null, null, renamed)).isEmpty();
    }

    /**
     * En revanche, {@code type} reste un signal exploitable : un libellé inconnu sur un endpoint
     * {@code revolving} désigne forcément un crédit renouvelable.
     */
    @Test
    void anUnknownLabelOnARevolving_stillRejectsAnotherProduct() {
        CampaignResponse renamed = campaign("X", "revolving", "NOUVELLE OFFRE", null, null, null, null);

        assertThat(CampaignConsistency.check("PB", null, null, renamed))
                .singleElement()
                .extracting(CampaignConsistency.Violation::property)
                .isEqualTo(SimulationParams.PROP_PRODUCT);
    }

    // ------------------------------------------------------------------ bornes de montant

    @ParameterizedTest
    @ValueSource(longs = {3001L, 40000L, 75000L})
    void anAmountWithinTheBounds_isAccepted(long amount) {
        assertThat(check("PB", amount, null)).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(longs = {3000L, 75001L, 150L})
    void anAmountOutsideTheBounds_isRejectedOnTheRightField(long amount) {
        assertThat(check("PB", amount, null)).singleElement()
                .extracting(CampaignConsistency.Violation::property)
                .isEqualTo(SimulationParams.PROP_AMOUNT);
    }

    /** Le message porte les bornes réelles : sans elles, le contributeur ignore quoi saisir. */
    @Test
    void theAmountMessageCarriesTheActualBounds() {
        assertThat(check("PB", 100L, null).get(0).message())
                .contains("NEOURL41")
                .contains("001")
                .contains("000")
                .doesNotContain(",00");
    }

    /**
     * PIÈGE DE PREMIÈRE UTILISATION, verrouillé ici pour qu'il soit visible.
     *
     * <p>Le CND crée {@code simAmount} avec la valeur {@code 3000} ({@code autocreated}), or le
     * Prêt Personnel commence à 3 001 €. Un contributeur qui active l'option Simulation, renseigne
     * le type de crédit et la provenance, puis enregistre SANS toucher au montant, se voit donc
     * refuser sa page sur un champ qu'il n'a jamais modifié.
     *
     * <p>Le message reste actionnable — il annonce les bornes attendues — mais la surprise est
     * réelle. Aucun défaut ne peut satisfaire les trois produits à la fois : le Crédit
     * Renouvelable démarre à 150 €, le Prêt Personnel à 3 001 €.
     */
    @Test
    void theCndDefaultAmountFallsBelowThePersonalLoanMinimum() {
        assertThat(check("PB", 3000L, 36L))
                .singleElement()
                .extracting(CampaignConsistency.Violation::property)
                .isEqualTo(SimulationParams.PROP_AMOUNT);
    }

    // ------------------------------------------------------------------ bornes de durée

    @ParameterizedTest
    @ValueSource(longs = {12L, 48L, 120L})
    void aDurationWithinTheBounds_isAccepted(long duration) {
        assertThat(check("PB", null, duration)).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(longs = {11L, 121L})
    void aDurationOutsideTheBounds_isRejectedOnTheRightField(long duration) {
        assertThat(check("PB", null, duration)).singleElement()
                .extracting(CampaignConsistency.Violation::property)
                .isEqualTo(SimulationParams.PROP_DURATION);
    }

    @Test
    void theDurationMessageCarriesTheActualBounds() {
        assertThat(check("PB", null, 200L).get(0).message())
                .contains("NEOURL41").contains("12").contains("120").contains("mois");
    }

    // ------------------------------------------------------------------ cumul

    /**
     * Les trois incohérences sont signalées d'une seule sauvegarde, chacune sur son champ. Les
     * révéler l'une après l'autre imposerait au contributeur trois allers-retours.
     */
    @Test
    void allThreeInconsistenciesAreReportedInASingleSave() {
        assertThat(check("CR", 1L, 999L))
                .extracting(CampaignConsistency.Violation::property)
                .containsExactlyInAnyOrder(
                        SimulationParams.PROP_PRODUCT,
                        SimulationParams.PROP_AMOUNT,
                        SimulationParams.PROP_DURATION);
    }
}
