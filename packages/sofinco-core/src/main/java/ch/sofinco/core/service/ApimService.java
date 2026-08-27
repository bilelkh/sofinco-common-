package ch.sofinco.core.service;

import ch.sofinco.core.exception.ApimException;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;

/**
 * Façade d'accès à l'APIM Sofinco. Expose le token Bearer, la configuration partagée et le
 * client HTTP mutualisé. Le {@link CloseableHttpClient} est créé une seule fois à l'activation
 * et réutilisé — pool de connexions et session TLS mutualisés, plus de handshake par requête.
 *
 * <p>Workflow : {@code POST /token} (Basic apimClientKey) → UUID accessToken, utilisé comme
 * Bearer pour {@code /loanSimulation/v3} et {@code /revolvingSimulation/v3} sur apimApiUrl.
 *
 * <p>Résolu via OSGi DS depuis la configuration {@code ch.sofinco.core.apim}.
 */
public interface ApimService {

    /**
     * Bearer access token (UUID opaque) valide. Mis en cache jusqu'à expiration ou
     * invalidation via {@link #invalidateCache()}. Granularité gérée par l'implémentation.
     *
     * @throws ApimException si la config est manquante ou si APIM rejette la demande
     */
    String getAccessToken() throws ApimException;

    /** Force l'invalidation du cache token. À appeler après une 401 pour forcer un refresh. */
    void invalidateCache();

    /** {@code true} si la configuration permet d'obtenir un token et d'appeler l'APIM. */
    boolean isConfigured();

    /**
     * {@code true} si le service peut honorer une demande de simulation — soit en mock,
     * soit configuré. Permet un court-circuit propre (retour vide, log DEBUG) plutôt qu'une
     * stacktrace par rendu tant que la config OSGi n'est pas posée.
     */
    default boolean isReady() {
        return isMockMode() || isConfigured();
    }

    /** {@code true} si le bundle est en mode mock (fixtures embarquées, aucun appel réseau). */
    boolean isMockMode();

    /** PartnerId configuré (défaut {@code "web_sofinco"}) — segment des paths v3. */
    String getPartnerId();

    /** apimApiUrl racine (sans / final) ; chaîne vide si non configurée. */
    String getApiUrl();

    /** apimOrigin configuré (priorité sur l'Origin auto-détecté du request) ; chaîne vide si absent. */
    String getOrigin();

    int getConnectTimeoutSeconds();
    int getSocketTimeoutSeconds();
    int getResponseTimeoutSeconds();

    /**
     * Client HTTP partagé du bundle (pool 20 max / 10 par route, keep-alive APIM mutualisé,
     * DNS cache mutualisé). Cycle de vie géré par le service — <b>ne jamais le fermer
     * côté appelant</b>. Retourne {@code null} si non activé.
     */
    CloseableHttpClient getHttpClient();
}
