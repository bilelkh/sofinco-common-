package ch.sofinco.core.config;

import org.osgi.service.metatype.annotations.AttributeDefinition;
import org.osgi.service.metatype.annotations.AttributeType;
import org.osgi.service.metatype.annotations.ObjectClassDefinition;

/**
 * Configuration OSGi du service ApimService — VERSION FINALE validée par tests recette.
 *
 * <p><b>Architecture validée (juin 2026) :</b> une seule URL racine APIM exposant à la fois
 * {@code /token} et les endpoints métier — confirmé par le support Sofinco.
 * <ul>
 *   <li>{@code POST {apimApiUrl}/token} avec Basic {@code apimClientKey} → accessToken UUID</li>
 *   <li>{@code POST {apimApiUrl}/loanSimulation/v3/...} et
 *       {@code POST {apimApiUrl}/revolvingSimulation/v3/...} avec Bearer accessToken UUID
 *       + headers Origin/Referer</li>
 * </ul>
 *
 * <p>L'ancien champ {@code apimTokenUrl} (intranet gateway dédiée) a été supprimé. Toute
 * configuration runtime qui le portait encore est silencieusement ignorée par Felix DS (champ
 * absent du metatype). Adapter les déploiements pour ne plus le renseigner.
 *
 * <p>⚠ Le PID de configuration reste {@code ch.sofinco.core.apim} (cf. {@code @Designate} /
 * {@code configurationPid} sur {@code ApimServiceImpl}) indépendamment du package Java, pour ne
 * pas orphaniner les configurations OSGi déployées en recette/prod.
 */
@ObjectClassDefinition(
        name = "Sofinco APIM Configuration",
        description = "OAuth2 client_credentials et URL APIM unifiée (token + simulations server-side). "
                    + "Configuration validée par tests curl recette : clientKey + UUID + URL publique + Origin/Referer."
)
public @interface ApimConfig {

    @AttributeDefinition(
            name = "APIM API URL (token + simulations)",
            description = "URL racine de l'APIM Sofinco pour TOUS les appels : "
                        + "POST /token (OAuth2 client_credentials) et POST /loanSimulation/v3 et /revolvingSimulation/v3. "
                        + "Recette: https://rct-api.sofinco.fr — "
                        + "Production: https://api.sofinco.fr"
    )
    String apimApiUrl() default "";

    @AttributeDefinition(
            name = "APIM Client Key (Basic Auth)",
            description = "Base64('consumer-key:consumer-secret') de l'application APIM 'clientKey'. ",
            type = AttributeType.PASSWORD
    )
    String apimClientKey() default "";

    @AttributeDefinition(
            name = "Partner identifier",
            description = "Valeur du segment {partnerId} dans le path des endpoints v3. Défaut: web_sofinco"
    )
    String partnerId() default "web_sofinco";

    @AttributeDefinition(
            name = "Origin header",
            description = "Valeur du header HTTP Origin envoyé aux appels APIM publique (requis par CORS). "
                        + "Production: https://www.sofinco.fr"
    )
    String apimOrigin() default "";

    @AttributeDefinition(name = "HTTP connect timeout (seconds)")
    int connectTimeoutSeconds() default 5;

    @AttributeDefinition(name = "HTTP socket timeout (seconds)")
    int socketTimeoutSeconds() default 10;

    @AttributeDefinition(name = "HTTP response timeout (seconds)")
    int responseTimeoutSeconds() default 15;

    @AttributeDefinition(
            name = "Token cache safety margin (seconds)",
            description = "Marge avant expiration nominale pour déclencher un refresh. Défaut: 120s"
    )
    int tokenSafetyMarginSeconds() default 120;

    @AttributeDefinition(
            name = "Token max cache TTL (seconds)",
            description = "Plafond du cache token côté Java, défense contre les expires_in absurdes "
                        + "(observé en recette : valeur sentinelle Long.MAX_VALUE/1000 = 'never expire'). "
                        + "Permet aussi de récupérer rapidement d'une rotation de clés côté APIM. "
                        + "Défaut: 3600s (1h)"
    )
    int tokenMaxCacheSeconds() default 3600;

    @AttributeDefinition(
            name = "Mock mode",
            description = "Si true, le client API branche un MockInterceptor qui court-circuite le réseau "
                        + "et retourne les fixtures JSON classpath (mocks/*.json) selon le CreditVariant. "
                        + "Utile en dev local sans VPN entreprise. Défaut: false"
    )
    boolean mockMode() default false;
}
