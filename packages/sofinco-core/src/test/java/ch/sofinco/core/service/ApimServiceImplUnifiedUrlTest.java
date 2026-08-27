package ch.sofinco.core.service;

import ch.sofinco.core.config.ApimConfig;
import ch.sofinco.core.config.ApimConfigFixtures;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Lock-in du contrat URL unifiée (validé par le support Sofinco, juin 2026) :
 * {@code /token} ET les endpoints métier vivent sur la MÊME racine {@link ApimConfig#apimApiUrl()}.
 *
 * <p>Cette suite verrouille trois invariants :
 * <ul>
 *   <li>{@link ApimConfig} n'a plus de champ {@code apimTokenUrl} (vérifié par compilation
 *       et par introspection sur les méthodes déclarées de l'annotation)</li>
 *   <li>{@code hasMandatoryFields} ne dépend plus de {@code apimTokenUrl} — une config avec
 *       {@code apimApiUrl} et {@code apimClientKey} renseignés est considérée complète</li>
 *   <li>Les getters publics ({@code getApiUrl()}, {@code getOrigin()}) exposent uniquement
 *       l'URL unifiée et le header Origin — pas de getter pour une URL token séparée</li>
 * </ul>
 *
 * <p>Si quelqu'un réintroduit {@code apimTokenUrl} dans le futur sans repenser la stratégie,
 * ces tests doivent échouer et alerter sur le changement de contrat.
 */
class ApimServiceImplUnifiedUrlTest {

    @Test
    void apimConfig_doesNotExposeTokenUrlField() {
        // Si quelqu'un réajoute apimTokenUrl() dans ApimConfig, ce test échouera et signalera
        // qu'il faut repenser la stratégie URL unifiée avant de merger.
        boolean hasTokenUrlMethod = java.util.Arrays.stream(ApimConfig.class.getDeclaredMethods())
                .anyMatch(m -> "apimTokenUrl".equals(m.getName()));
        assertThat(hasTokenUrlMethod)
                .as("apimTokenUrl supprimé en juin 2026 — /token vit sur apimApiUrl désormais. "
                  + "Si tu réajoutes ce champ, ouvre un ADR pour repenser la stratégie URL.")
                .isFalse();
    }

    @Test
    void apimConfig_exposesExactlyExpectedStringFields() {
        // Inventaire figé : 4 champs string (apimApiUrl, apimClientKey, partnerId, apimOrigin).
        long stringFieldCount = java.util.Arrays.stream(ApimConfig.class.getDeclaredMethods())
                .filter(m -> m.getReturnType() == String.class)
                .count();
        assertThat(stringFieldCount).isEqualTo(4);
    }

    @Test
    void hasMandatoryFields_doesNotRequireTokenUrl() {
        // Une config avec uniquement apimApiUrl + apimClientKey est désormais "complète".
        ApimConfig cfg = stub("https://rct-api.sofinco.fr", "Y29uc3VtZXJfa2V5OnNlY3JldA==");
        ApimServiceImpl svc = new ApimServiceImpl(cfg, null);
        assertThat(svc.isConfigured()).isTrue();
    }

    @Test
    void hasMandatoryFields_falseWhenApiUrlMissing() {
        ApimConfig cfg = stub("", "key-quelconque");
        ApimServiceImpl svc = new ApimServiceImpl(cfg, null);
        assertThat(svc.isConfigured()).isFalse();
    }

    @Test
    void hasMandatoryFields_falseWhenClientKeyMissing() {
        ApimConfig cfg = stub("https://rct-api.sofinco.fr", "");
        ApimServiceImpl svc = new ApimServiceImpl(cfg, null);
        assertThat(svc.isConfigured()).isFalse();
    }

    @Test
    void apimService_doesNotExposeTokenUrlGetter() {
        // Le contrat public ApimService n'expose PAS getTokenUrl() — vérification par
        // introspection. Si quelqu'un ajoute un tel getter dans le futur, ce test échouera.
        boolean hasTokenUrlGetter = java.util.Arrays.stream(ApimService.class.getMethods())
                .anyMatch(m -> "getTokenUrl".equals(m.getName())
                            || "getApimTokenUrl".equals(m.getName()));
        assertThat(hasTokenUrlGetter)
                .as("ApimService ne doit pas exposer de getter URL token — /token vit sur getApiUrl().")
                .isFalse();
    }

    @Test
    void getApiUrl_returnsCleanedUrlWithoutTrailingSlash_eligibleForTokenSuffix() {
        // Le contrat de getApiUrl() : URL strippée + sans / final, donc on peut concaténer
        // "/token" ou "/loanSimulation/v3/..." sans risque de double slash.
        ApimConfig cfg = stub("https://rct-api.sofinco.fr/", "key");
        ApimServiceImpl svc = new ApimServiceImpl(cfg, null);
        assertThat(svc.getApiUrl())
                .isEqualTo("https://rct-api.sofinco.fr")
                .doesNotEndWith("/");
        // → "https://rct-api.sofinco.fr" + "/token" = "https://rct-api.sofinco.fr/token" ✓
    }

    /** Fixture partagée — cf. {@link ApimConfigFixtures} pour le choix du mock. */
    private static ApimConfig stub(String apiUrl, String clientKey) {
        return ApimConfigFixtures.builder().apiUrl(apiUrl).clientKey(clientKey).build();
    }
}
