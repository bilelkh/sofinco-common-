package ch.sofinco.core.config;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Fabrique unique d'{@link ApimConfig} pour les tests.
 *
 * <p><b>Pourquoi ici.</b> Cette classe vit dans le paquet du type qu'elle fabrique, et non dans
 * celui d'un de ses consommateurs. {@code ch.sofinco.core.service} et {@code ch.sofinco.core.client}
 * dépendent tous deux de {@code config} en production : les tests suivent la même direction. La
 * placer côté {@code service} aurait obligé les tests du client à dépendre du service — une
 * dépendance que le code de production n'a pas.
 *
 * <p><b>Pourquoi un mock et non une implémentation.</b> {@code ApimConfig} est un type ANNOTATION.
 * L'implémenter — fût-ce anonymement — déclenche l'avertissement {@code intf-annotation} du
 * compilateur, impose de redéclarer {@code annotationType()} et les onze accesseurs, et fige ce
 * contrat dans chaque fichier de test : ajouter une option de configuration cassait alors la
 * compilation de tous. Un mock ignore ce qu'on ne lui demande pas.
 *
 * <p><b>Pourquoi une fabrique partagée.</b> Six fichiers portaient leur propre helper, chacun avec
 * ses valeurs par défaut. Des délais divergents d'un fichier à l'autre produisent des échecs dont
 * la cause est le fichier voisin, pas le code testé.
 *
 * <p><b>Les délais sont stubés, jamais laissés à zéro.</b> Un mock non stubé renvoie {@code 0} pour
 * un {@code int}, et {@code HttpClientFactory} construirait alors un client aux délais nuls — un
 * test qui échoue pour une raison sans rapport avec son objet.
 */
public final class ApimConfigFixtures {

    private ApimConfigFixtures() {
    }

    /** Configuration complète et cohérente : le point de départ de la plupart des tests. */
    public static ApimConfig complete() {
        return builder()
                .apiUrl("https://rct-api.sofinco.fr")
                .clientKey("Y29uc3VtZXJfa2V5OnNlY3JldA==")
                .build();
    }

    public static Builder builder() {
        return new Builder();
    }

    /** Seules les valeurs qui varient d'un test à l'autre sont exposées. */
    public static final class Builder {

        private String apiUrl = "";
        private String clientKey = "";
        private String origin = "";
        private boolean mockMode = false;

        public Builder apiUrl(String value) {
            this.apiUrl = value;
            return this;
        }

        public Builder clientKey(String value) {
            this.clientKey = value;
            return this;
        }

        public Builder origin(String value) {
            this.origin = value;
            return this;
        }

        public Builder mockMode(boolean value) {
            this.mockMode = value;
            return this;
        }

        public ApimConfig build() {
            ApimConfig config = mock(ApimConfig.class);
            when(config.apimApiUrl()).thenReturn(apiUrl);
            when(config.apimClientKey()).thenReturn(clientKey);
            when(config.apimOrigin()).thenReturn(origin);
            when(config.mockMode()).thenReturn(mockMode);
            when(config.partnerId()).thenReturn("web_sofinco");
            when(config.connectTimeoutSeconds()).thenReturn(5);
            when(config.socketTimeoutSeconds()).thenReturn(10);
            when(config.responseTimeoutSeconds()).thenReturn(15);
            when(config.tokenSafetyMarginSeconds()).thenReturn(120);
            when(config.tokenMaxCacheSeconds()).thenReturn(3600);
            return config;
        }
    }
}
