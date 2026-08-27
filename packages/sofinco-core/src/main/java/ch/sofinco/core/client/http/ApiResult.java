package ch.sofinco.core.client.http;

/**
 * Résultat typé d'un appel HTTP via {@link ApimHttpExecutor}. Remplace l'ambiguïté
 * {@code String + null} par une discrimination explicite : {@link #isSuccess()} (2xx),
 * {@link #isClientError()} (4xx), {@link #isServerError()} (5xx, réessayable),
 * {@link #isAuthFailure()} (401/403). Le {@code correlationId} aide la corrélation
 * avec les logs APIM/WSO2 en diagnostic.
 *
 * <p>{@link #toString()} override volontaire : le body n'est PAS inclus — il peut
 * contenir des données sensibles. Pour debug, exposer explicitement via {@link #body()}.
 */
public record ApiResult(int httpCode, String body, String correlationId) {

    public boolean isSuccess()      { return httpCode >= 200 && httpCode < 300; }
    public boolean isClientError()  { return httpCode >= 400 && httpCode < 500; }
    public boolean isServerError()  { return httpCode >= 500 && httpCode < 600; }
    public boolean isAuthFailure()  { return httpCode == 401 || httpCode == 403; }
    public boolean hasBody()        { return body != null && !body.isEmpty(); }

    @Override
    public String toString() {
        return "ApiResult{httpCode=" + httpCode + ", correlationId=" + correlationId + "}";
    }
}
