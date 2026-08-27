package ch.sofinco.core.client.http;

/**
 * Constantes des headers HTTP des appels APIM Sofinco. Centralise les noms et valeurs
 * (Sonar S1192). Casses exactes attendues par la gateway WSO2 (ex. {@code Correlationid}
 * pas {@code Correlation-Id}, validé en recette).
 */
public final class ApimHeaders {

    private ApimHeaders() {
        // util statique
    }

    // Noms de headers
    public static final String AUTHORIZATION    = "Authorization";
    public static final String CONTENT_TYPE     = "Content-Type";
    public static final String ACCEPT           = "Accept";
    public static final String ORIGIN           = "Origin";
    public static final String REFERER          = "Referer";

    /** Header propriétaire Sofinco ; ne pas mettre en {@code Correlation-Id} (WSO2 ne route pas). */
    public static final String CORRELATION_ID   = "Correlationid";

    /** Header propriétaire Sofinco identifiant l'application cliente côté APIM. */
    public static final String CONTEXT_APP      = "context-applicationid";

    // Valeurs de headers
    public static final String CONTEXT_APP_VALUE = "credit-partner";
    public static final String ACCEPT_VALUE      = "application/json, text/plain, */*";
    public static final String CONTENT_TYPE_JSON = "application/json";
    public static final String CONTENT_TYPE_FORM = "application/x-www-form-urlencoded";
    public static final String ACCEPT_JSON       = "application/json";
    public static final String BEARER_PREFIX     = "Bearer ";
    public static final String BASIC_PREFIX      = "Basic ";
}
