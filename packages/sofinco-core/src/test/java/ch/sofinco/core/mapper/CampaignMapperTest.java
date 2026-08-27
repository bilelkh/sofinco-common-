package ch.sofinco.core.mapper;

import ch.sofinco.core.model.representativeexample.CampaignResponse;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Mise en forme des jetons de campagne.
 *
 * <p>La réponse de référence est celle relevée en production sur {@code NEOURL41} : c'est elle qui
 * a servi à établir le contrat, et un test bâti sur des valeurs inventées ne dirait rien du
 * formatage réellement attendu dans une mention légale.
 */
class CampaignMapperTest {

    private static CampaignResponse production() {
        return new CampaignResponse(
                "NEOURL41", "loan", "PRÊT PERSONNEL",
                3001.0, 75000.0,
                12, 120,
                4.314, 14.628,
                4.4, 15.65,
                4.9,
                "2017-09-25", "2026-08-26");
    }

    @Test
    void nullResponse_yieldsAnEmptyMapRatherThanNull() {
        assertThat(CampaignMapper.toVars(null)).isEmpty();
    }

    /**
     * DÉCIMALES VARIABLES sur les bornes d'offre — alignement sur l'ancien site, qui rendait déjà
     * ces montants sans décimales ({@code currency(..., NO_DECIMAL)}). « pour un montant de
     * 3 001,00 € à 75 000,00 € » s'alourdit de zéros qui ne portent aucune information.
     */
    @Test
    void wholeAmountsAreRenderedWithoutDecimals() {
        Map<String, String> vars = CampaignMapper.toVars(production());
        assertThat(vars.get("minAmount")).endsWith("001 €").doesNotContain(",00");
        assertThat(vars.get("maxAmount")).endsWith("000 €").doesNotContain(",00");
    }

    /**
     * La contrepartie, et c'est elle qui interdit de fixer zéro décimale : un montant à centimes
     * les CONSERVE. Afficher « à partir de 3 001 € » quand le minimum réel est 3 001,50 €
     * annoncerait au visiteur un seuil réglementaire qui n'existe pas.
     */
    @Test
    void amountsWithCentsKeepThem() {
        CampaignResponse withCents = new CampaignResponse(
                "X", "loan", "L", 3001.5, 75000.0, null, null,
                null, null, null, null, null, null, null);

        Map<String, String> vars = CampaignMapper.toVars(withCents);
        assertThat(vars.get("minAmount")).endsWith("001,50 €");
        assertThat(vars.get("maxAmount")).doesNotContain(",00");
    }

    @Test
    void ratesAreFormattedAsPercentages() {
        Map<String, String> vars = CampaignMapper.toVars(production());
        assertThat(vars.get("minAnnualGlobalEffectiveRate")).contains("%");
        assertThat(vars.get("maxAnnualDebitRate")).contains("%");
        assertThat(vars.get("promoGlobalEffectiveRate")).contains("%");
    }

    /**
     * Le mot « mois » appartient à la PHRASE du contributeur — « de {minDuration} à {maxDuration}
     * mois ». L'inclure dans la valeur produirait « de 12 mois à 120 mois mois ».
     */
    @Test
    void durationsAreBareNumbers() {
        Map<String, String> vars = CampaignMapper.toVars(production());
        assertThat(vars.get("minDuration")).isEqualTo("12");
        assertThat(vars.get("maxDuration")).isEqualTo("120");
    }

    @Test
    void datesAreRenderedTheFrenchWay() {
        Map<String, String> vars = CampaignMapper.toVars(production());
        assertThat(vars.get("startDate")).isEqualTo("25/09/2017");
        assertThat(vars.get("endDate")).isEqualTo("26/08/2026");
    }

    /**
     * {@code id}, {@code type} et {@code label} sont désérialisés mais jamais exposés : les deux
     * premiers sont techniques, et {@code label} est un nom bien trop générique pour un espace de
     * jetons partagé avec les gabarits d'autres modules.
     */
    @Test
    void technicalFieldsAreNeverExposedAsTokens() {
        assertThat(CampaignMapper.toVars(production()))
                .doesNotContainKeys("id", "type", "label")
                .hasSize(11);
    }

    /**
     * Une valeur absente est ABSENTE de la carte, jamais présente et vide : le consommateur laisse
     * alors le jeton visible, ce qui signale la panne. Une mention amputée d'un taux, elle,
     * passerait la relecture.
     */
    @Test
    void missingValuesAreOmitted_notBlank() {
        CampaignResponse partial = new CampaignResponse(
                "X", "loan", "L", 3001.0, null, null, null, null, null, null, null, null, null, null);

        Map<String, String> vars = CampaignMapper.toVars(partial);
        assertThat(vars).containsKey("minAmount").doesNotContainKey("maxAmount");
    }

    /**
     * Une date illisible est omise plutôt que recopiée : « 2026-08-26 » dans une mention française
     * aurait l'air d'une valeur voulue tout en signalant moins clairement le défaut qu'un jeton
     * resté visible.
     */
    @Test
    void unparseableDateIsOmitted_notEchoedRaw() {
        CampaignResponse broken = new CampaignResponse(
                "X", "loan", "L", null, null, null, null, null, null, null, null, null,
                "pas-une-date", "26/08/2026");

        assertThat(CampaignMapper.toVars(broken)).doesNotContainKeys("startDate", "endDate");
    }
}
