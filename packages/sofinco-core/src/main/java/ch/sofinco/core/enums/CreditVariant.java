package ch.sofinco.core.enums;

import java.util.Locale;

/**
 * Variante de crédit pour le composant Representative Example.
 *
 * <p>Chaque variante porte ses propres données (ressource mock, template d'endpoint v3,
 * propriété JCR du texte d'assurance, identifiant JS) afin d'éviter la dispersion en
 * {@code switch} qui existait dans le service et le bridge.
 *
 * <p>Le mapping product (CND) → variant est fait dans {@link #fromProduct(String)} :
 * <ul>
 *   <li>"PB"  → PRET_PERSO        (endpoint /loanSimulation/v3)</li>
 *   <li>"RAC" → RACHAT_CREDIT     (endpoint /loanSimulation/v3)</li>
 *   <li>"CR"  → CREDIT_RENOUVELABLE (endpoint /revolvingSimulation/v3)</li>
 * </ul>
 */
public enum CreditVariant {

    /** Prêt Personnel (CND product=PB) → endpoint loanSimulation/v3 */
    PRET_PERSO(
            "/mocks/loan_pb_response.json",
            "/loanSimulation/v3/partners/%s/campaigns/%s/simulations/loans/calculate",
            "insurancePB",
            "pretPerso",
            false),

    /** Rachat de Crédit (CND product=RAC) → endpoint loanSimulation/v3 */
    RACHAT_CREDIT(
            "/mocks/loan_rac_response.json",
            "/loanSimulation/v3/partners/%s/campaigns/%s/simulations/loans/calculate",
            "insuranceRAC",
            "rachatCredit",
            false),

    /** Crédit Renouvelable (CND product=CR) → endpoint revolvingSimulation/v3 */
    CREDIT_RENOUVELABLE(
            "/mocks/revolving_cr_response.json",
            "/revolvingSimulation/v3/partners/%s/campaigns/%s/simulations/revolvings/calculate",
            "insuranceCR",
            "creditRenouvelable",
            true);

    private final String mockResourcePath;
    private final String endpointPathTemplate;
    private final String insuranceJcrProp;
    private final String jsString;
    private final boolean usesRevolvingApi;

    CreditVariant(String mockResourcePath, String endpointPathTemplate,
                  String insuranceJcrProp, String jsString, boolean usesRevolvingApi) {
        this.mockResourcePath = mockResourcePath;
        this.endpointPathTemplate = endpointPathTemplate;
        this.insuranceJcrProp = insuranceJcrProp;
        this.jsString = jsString;
        this.usesRevolvingApi = usesRevolvingApi;
    }

    /** Chemin classpath de la fixture mock JSON pour cette variante. */
    public String mockResourcePath() { return mockResourcePath; }

    /** Template du path v3 ({@code String.format} avec partnerId puis sourceCode). */
    public String endpointPathTemplate() { return endpointPathTemplate; }

    /** Nom de la propriété JCR portant le texte d'assurance éditorial de cette variante. */
    public String insuranceJcrProp() { return insuranceJcrProp; }

    /** Identifiant consommé côté TypeScript ({@code "pretPerso"} etc.). */
    public String jsString() { return jsString; }

    /** {@code true} si la variante passe par l'API revolving (CR), {@code false} pour loan (PB/RAC). */
    public boolean usesRevolvingApi() { return usesRevolvingApi; }

    public boolean isCreditRenouvelable() {
        return this == CREDIT_RENOUVELABLE;
    }

    public boolean isLoan() {
        return this == PRET_PERSO || this == RACHAT_CREDIT;
    }

    /**
     * Convertit la valeur de la CND {@code product} en variant.
     *
     * <p>Utilise {@link Locale#ROOT} sur {@code toUpperCase} pour éviter le bug Turkish-i
     * ({@code "ci"} en TR devient {@code "Cİ"} avec I pointé et casserait la comparaison
     * avec {@code "CI"}).
     *
     * @param product valeur de la propriété "product" sur {@code sofnt:repexSimulator}
     * @return le variant correspondant, ou {@code null} si le produit n'est pas reconnu
     */
    public static CreditVariant fromProduct(String product) {
        if (product == null) {
            return null;
        }
        return switch (product.toUpperCase(Locale.ROOT)) {
            case "PB" -> PRET_PERSO;
            case "RAC" -> RACHAT_CREDIT;
            case "CR" -> CREDIT_RENOUVELABLE;
            default -> null;
        };
    }
}
