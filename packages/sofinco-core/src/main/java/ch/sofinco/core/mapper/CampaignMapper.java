package ch.sofinco.core.mapper;

import ch.sofinco.core.model.representativeexample.CampaignResponse;
import ch.sofinco.core.util.AmountFormatter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Transforme une {@link CampaignResponse} en jetons prêts à l'affichage.
 *
 * <p>L'APIM renvoie des nombres bruts — {@code 3001.0}, {@code 4.314}, {@code "2026-08-26"}. Le
 * contributeur écrit une phrase et attend « 3 001 € », « 4,314 % », « 26/08/2026 ». Le formatage
 * est donc un travail de cartographie, exactement comme pour l'exemple représentatif : le laisser
 * au gabarit obligerait chaque composant à le refaire, et à diverger.
 *
 * <p><b>Onze jetons.</b> {@code id}, {@code type} et {@code label} sont désérialisés mais non
 * exposés : les deux premiers sont techniques, et {@code label} est un nom trop générique pour un
 * espace de jetons partagé avec les gabarits d'autres modules.
 *
 * <p>Une valeur absente est ABSENTE de la carte, jamais présente et vide. Le consommateur laisse
 * alors le jeton visible, ce qui signale la panne — une mention amputée d'un taux passerait, elle,
 * inaperçue en relecture.
 */
public final class CampaignMapper {

    private static final Logger LOG = LoggerFactory.getLogger(CampaignMapper.class);

    /** Format ISO renvoyé par l'APIM ({@code 2026-08-26}). */
    private static final DateTimeFormatter API_DATE = DateTimeFormatter.ISO_LOCAL_DATE;

    /** Format attendu dans une mention légale française. */
    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private CampaignMapper() {
    }

    /**
     * Construit la carte des jetons de campagne.
     *
     * @param campaign la réponse APIM, ou {@code null}
     * @return une carte, éventuellement vide, jamais {@code null}
     */
    public static Map<String, String> toVars(CampaignResponse campaign) {
        Map<String, String> vars = new LinkedHashMap<>();
        if (campaign == null) {
            return vars;
        }

        putEuros(vars, "minAmount", campaign.minAmount());
        putEuros(vars, "maxAmount", campaign.maxAmount());

        putMonths(vars, "minDuration", campaign.minDuration());
        putMonths(vars, "maxDuration", campaign.maxDuration());

        putPercent(vars, "minAnnualDebitRate", campaign.minAnnualDebitRate());
        putPercent(vars, "maxAnnualDebitRate", campaign.maxAnnualDebitRate());
        putPercent(vars, "minAnnualGlobalEffectiveRate", campaign.minAnnualGlobalEffectiveRate());
        putPercent(vars, "maxAnnualGlobalEffectiveRate", campaign.maxAnnualGlobalEffectiveRate());
        putPercent(vars, "promoGlobalEffectiveRate", campaign.promoGlobalEffectiveRate());

        putDate(vars, "startDate", campaign.startDate());
        putDate(vars, "endDate", campaign.endDate());

        return vars;
    }

    /**
     * Borne d'offre : décimales VARIABLES.
     *
     * <p>L'ancien site rendait déjà ces montants sans décimales, et une phrase annonçant « de
     * 3 001,00 € à 75 000,00 € » s'alourdit de zéros qui ne disent rien. Les centimes restent
     * affichés s'ils existent — masquer un {@code 3 001,50 €} annoncerait un seuil réglementaire
     * qui n'est pas celui de l'offre.
     */
    private static void putEuros(Map<String, String> vars, String key, Double value) {
        if (value != null) {
            vars.put(key, AmountFormatter.formatEurosAdaptive(value));
        }
    }

    private static void putPercent(Map<String, String> vars, String key, Double value) {
        if (value != null) {
            vars.put(key, AmountFormatter.formatPercent(value));
        }
    }

    /**
     * Durée en NOMBRE NU, sans l'unité.
     *
     * <p>Les mentions de l'ancien site écrivent « de {minDuration} à {maxDuration} mois » : le mot
     * appartient à la phrase du contributeur, pas au jeton. L'y inclure produirait « de 12 mois à
     * 120 mois mois », et retirer le mot de la phrase lui interdirait toute autre tournure.
     */
    private static void putMonths(Map<String, String> vars, String key, Integer value) {
        if (value != null) {
            vars.put(key, String.valueOf(value));
        }
    }

    /**
     * Date au format français.
     *
     * <p>Une date illisible est OMISE plutôt que recopiée telle quelle : afficher « 2026-08-26 »
     * dans une mention légale française signalerait un défaut moins clairement qu'un jeton resté
     * visible, tout en ayant l'air d'une valeur voulue.
     */
    private static void putDate(Map<String, String> vars, String key, String isoDate) {
        if (isoDate == null || isoDate.isBlank()) {
            return;
        }
        try {
            vars.put(key, LocalDate.parse(isoDate, API_DATE).format(DISPLAY_DATE));
        } catch (DateTimeParseException e) {
            LOG.warn("Date de campagne illisible pour {} : « {} » — jeton laissé non résolu",
                    key, isoDate);
        }
    }
}
