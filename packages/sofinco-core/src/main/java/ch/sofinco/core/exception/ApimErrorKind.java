package ch.sofinco.core.exception;

/**
 * Catégories d'échec portées par {@link ApimException}. Permet aux appelants de brancher sur
 * une enum typée plutôt que sur le message d'exception (fragile).
 *
 * <p>Les valeurs couvrent les chemins d'échec actuellement observables sur la stack APIM. Toute
 * extension doit rester cohérente avec les métriques Micrometer ({@code apim.errors{kind=...}}).
 */
public enum ApimErrorKind {

    /** Catégorie non précisée (constructeurs legacy ou erreur transitoire non classifiée). */
    UNSPECIFIED,

    /** Service ApimService non activé (config OSGi pas encore posée à l'init). */
    SERVICE_NOT_ACTIVATED,

    /** Configuration APIM incomplète (URL, clientKey ou partnerId manquant). */
    CONFIG_MISSING,

    /** HttpClient partagé indisponible (cycle activate/deactivate en cours). */
    HTTP_CLIENT_UNAVAILABLE,

    /** Refus fail-closed : Bearer/Basic auth sur HTTP non-local interdit. */
    INSECURE_TRANSPORT,

    /** Échec d'obtention du token Bearer auprès du endpoint /token. */
    TOKEN_FETCH_FAILED,

    /** APIM a répondu 401 même après refresh du token (auth durablement KO). */
    AUTH_REJECTED,

    /**
     * Ressource absente (HTTP 404) — une réponse DÉFINITIVE, à ne pas confondre avec une panne.
     *
     * <p>Distinction indispensable au contrôle de saisie : une provenance inexistante doit être
     * refusée au contributeur, alors qu'un APIM injoignable ne doit rien bloquer du tout.
     */
    RESOURCE_NOT_FOUND,

    /** APIM a répondu une erreur 4xx hors auth (mauvaise requête, ressource introuvable). */
    CLIENT_ERROR,

    /** APIM a répondu une erreur 5xx (panne backend APIM). */
    SERVER_ERROR,

    /** Erreur réseau/IO en transit (timeout, reset, DNS). */
    TRANSPORT_ERROR,

    /** Réponse APIM illisible ou non conforme au contrat attendu (parse JSON). */
    RESPONSE_PARSE_ERROR
}
