package ch.sofinco.core.validation.simulation;

import ch.sofinco.core.model.representativeexample.CampaignResponse;
import ch.sofinco.core.model.representativeexample.SimulationParams;
import ch.sofinco.core.util.AmountFormatter;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Confronte une saisie aux bornes réelles d'une campagne. <b>Logique pure</b> : ni JCR, ni OSGi, ni
 * réseau.
 *
 * <p>Séparée du validateur pour être éprouvée seule. Les règles de cohérence sont le cœur du
 * contrôle — celles qui refusent le travail d'un contributeur — et les tester à travers un mock de
 * nœud JCR et un contexte Bean Validation reviendrait à vérifier surtout la plomberie.
 */
final class CampaignConsistency {

    private static final String PRODUCT_CR = "CR";
    private static final String REVOLVING_TYPE = "revolving";

    static final String MESSAGE_PRODUCT_MISMATCH =
            "Type de crédit incompatible avec la provenance : la campagne %s correspond à %s";

    static final String MESSAGE_AMOUNT_RANGE =
            "Montant hors des bornes de l'offre (%s) : attendu entre %s et %s";

    static final String MESSAGE_DURATION_RANGE =
            "Durée hors des bornes de l'offre (%s) : attendue entre %s et %s mois";

    /**
     * Libellés APIM observés, sous leur forme normalisée (cf. {@link #normalize}).
     *
     * <p>Ils viennent du marketing et peuvent évoluer : un libellé absent de cette table ne
     * déclenche AUCUN refus, il retombe sur le seul signal technique.
     */
    private static final Map<String, String> LABEL_TO_PRODUCT = Map.of(
            "PRET PERSONNEL", "PB",
            "CREDIT RENOUVELABLE", PRODUCT_CR,
            "RACHAT DE CREDITS", "RAC");

    private CampaignConsistency() {
    }

    /** Une incohérence, avec le champ exact où corriger. */
    record Violation(String property, String message) {
    }

    /**
     * Toutes les incohérences d'une saisie, ou une liste vide.
     *
     * <p>Une valeur absente ne produit jamais de violation ici : son caractère obligatoire relève
     * du validateur, et signaler deux fois le même champ manquant noierait le message utile.
     */
    static List<Violation> check(String product, Long amount, Long duration, CampaignResponse campaign) {
        List<Violation> violations = new ArrayList<>();
        if (campaign == null) {
            return violations;
        }
        checkProduct(product, campaign, violations);
        checkAmount(amount, campaign, violations);
        checkDuration(duration, campaign, violations);
        return violations;
    }

    private static void checkProduct(String product, CampaignResponse campaign,
                                     List<Violation> violations) {
        if (product == null) {
            return;
        }
        String expected = productOf(campaign);
        if (expected != null && !expected.equals(product)) {
            violations.add(new Violation(SimulationParams.PROP_PRODUCT,
                    String.format(MESSAGE_PRODUCT_MISMATCH, campaign.id(), expected)));
        }
    }

    /**
     * Type de crédit déduit de la campagne, ou {@code null} si elle ne permet pas de trancher.
     *
     * <p><b>Deux signaux, du plus robuste au plus fragile.</b> Le {@code label} est du texte
     * MARKETING : « PRÊT PERSONNEL » peut devenir « PRÊT PERSO » sans préavis. Un libellé non
     * reconnu ne bloque donc rien — sans quoi un changement de dénomination gèlerait la
     * contribution de tout le site en attendant une livraison.
     *
     * <p>On retombe alors sur {@code type}, technique et stable, qui sépare à coup sûr un crédit
     * renouvelable d'un prêt. Il ne distingue en revanche pas un Prêt Personnel d'un Rachat de
     * Crédits — tous deux servis par l'endpoint {@code loan} — donc n'exige rien dans ce cas.
     */
    private static String productOf(CampaignResponse campaign) {
        String expected = LABEL_TO_PRODUCT.get(normalize(campaign.label()));
        if (expected != null) {
            return expected;
        }
        return REVOLVING_TYPE.equalsIgnoreCase(campaign.type()) ? PRODUCT_CR : null;
    }

    /**
     * Normalisation d'un libellé : majuscules, accents retirés, espaces réduits.
     *
     * <p>« Crédit Renouvelable » et « CRÉDIT  RENOUVELABLE » désignent la même chose. Comparer les
     * chaînes brutes ferait échouer le contrôle sur une casse ou une espace double, donc refuserait
     * une saisie correcte — le pire résultat possible pour un contrôle de saisie.
     */
    private static String normalize(String label) {
        if (label == null) {
            return "";
        }
        String withoutAccents = Normalizer.normalize(label, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return withoutAccents.toUpperCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }

    private static void checkAmount(Long amount, CampaignResponse campaign,
                                    List<Violation> violations) {
        if (amount == null || campaign.minAmount() == null || campaign.maxAmount() == null) {
            return;
        }
        if (amount < campaign.minAmount() || amount > campaign.maxAmount()) {
            violations.add(new Violation(SimulationParams.PROP_AMOUNT,
                    String.format(MESSAGE_AMOUNT_RANGE, campaign.id(),
                            AmountFormatter.formatEurosAdaptive(campaign.minAmount()),
                            AmountFormatter.formatEurosAdaptive(campaign.maxAmount()))));
        }
    }

    private static void checkDuration(Long duration, CampaignResponse campaign,
                                      List<Violation> violations) {
        if (duration == null || campaign.minDuration() == null || campaign.maxDuration() == null) {
            return;
        }
        if (duration < campaign.minDuration() || duration > campaign.maxDuration()) {
            violations.add(new Violation(SimulationParams.PROP_DURATION,
                    String.format(MESSAGE_DURATION_RANGE, campaign.id(),
                            campaign.minDuration(), campaign.maxDuration())));
        }
    }
}
