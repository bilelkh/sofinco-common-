package ch.sofinco.core.service;

import ch.sofinco.core.config.ApimConfig;
import ch.sofinco.core.config.ApimConfigFixtures;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Contrôles de configuration APIM — logique pure, sans conteneur.
 *
 * <p>{@code cleanConfigString} et {@code isStripChar} sont couverts par
 * {@code ApimServiceImplCleanConfigTest} ; ce fichier traite le reste.
 */
class ApimConfigsTest {

    // ------------------------------------------------------------------ champs obligatoires

    @Test
    void mandatoryFields_requireBothUrlAndKey() {
        assertThat(ApimConfigs.hasMandatoryFields(cfg("https://api.sofinco.fr", "key"))).isTrue();

        assertThat(ApimConfigs.hasMandatoryFields(cfg("", "key"))).isFalse();
        assertThat(ApimConfigs.hasMandatoryFields(cfg("https://api.sofinco.fr", ""))).isFalse();
        assertThat(ApimConfigs.hasMandatoryFields(cfg("   ", "key"))).isFalse();
        assertThat(ApimConfigs.hasMandatoryFields(cfg("https://api.sofinco.fr", "   "))).isFalse();
    }

    /** Config absente = service non activé : ne doit pas lever, seulement répondre « non ». */
    @Test
    void mandatoryFields_nullConfig_isFalse() {
        assertThat(ApimConfigs.hasMandatoryFields(null)).isFalse();
    }

    // ------------------------------------------------------------------ contrôle HTTPS

    /**
     * Le contrôle journalise sans jamais bloquer : refuser au démarrage priverait le site de son
     * exemple représentatif, alors que le fail-closed réel se joue à l'appel
     * ({@code SecurityChecks.isInsecureHttpNonLocal} dans {@code ApimTokenStore}).
     */
    @Test
    void httpsCheck_neverThrows_whateverTheUrl() {
        assertThatCode(() -> {
            ApimConfigs.validateHttpsForProduction(cfg("https://api.sofinco.fr", "k"));   // conforme
            ApimConfigs.validateHttpsForProduction(cfg("http://localhost:8080", "k"));    // loopback, toléré
            ApimConfigs.validateHttpsForProduction(cfg("http://127.0.0.1:8080", "k"));    // loopback
            ApimConfigs.validateHttpsForProduction(cfg("http://api.sofinco.fr", "k"));    // ⚠ ERROR journalisé
            ApimConfigs.validateHttpsForProduction(cfg("", "k"));                         // vide : rien à dire
        }).doesNotThrowAnyException();
    }

    /** Une URL bavante d'espace ne doit pas être classée « non sécurisée » à tort. */
    @Test
    void httpsCheck_stripsBeforeValidating() {
        assertThatCode(() -> ApimConfigs.validateHttpsForProduction(
                cfg("  https://api.sofinco.fr\r\n", "k"))).doesNotThrowAnyException();
    }

    // ------------------------------------------------------------------ espaces parasites

    @Test
    void whitespaceWarning_neverThrows_onCleanOrDirtyValues() {
        assertThatCode(() -> {
            ApimConfigs.warnIfWhitespaceInConfig(cfg("https://api.sofinco.fr", "key"), "activate");
            // NBSP U+00A0, espace de fin, CR/LF : les cas observés en production.
            ApimConfigs.warnIfWhitespaceInConfig(
                    cfg("https://api.sofinco.fr ", "key \r\n"), "modified");
        }).doesNotThrowAnyException();
    }

    /** Une valeur nulle ne doit pas faire échouer le démarrage du service. */
    @Test
    void whitespaceWarning_toleratesNullValues() {
        assertThatCode(() -> ApimConfigs.warnIfWhitespaceInConfig(cfg(null, null), "activate"))
                .doesNotThrowAnyException();
    }

    // ------------------------------------------------------------------ helper

    /** Fixture partagée — cf. {@link ApimConfigFixtures} pour le choix du mock. */
    private static ApimConfig cfg(String apiUrl, String clientKey) {
        return ApimConfigFixtures.builder()
                .apiUrl(apiUrl).clientKey(clientKey)
                .origin("https://www.sofinco.fr")
                .build();
    }
}
