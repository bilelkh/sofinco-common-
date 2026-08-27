package ch.sofinco.core.model.apim;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Réponse OAuth2 brute du POST /token.
 *
 * <p>⚠ Le champ {@code expires_in} peut être une valeur raisonnable (~1200s), une sentinelle
 * absurde (Long.MAX_VALUE/1000 = "never expire" côté WSO2), ou zéro/négatif. La sanitisation
 * est faite dans {@code ApimServiceImpl.sanitizeExpiresIn()}.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record TokenResponse(
        @JsonProperty("access_token") String accessToken,
        @JsonProperty("token_type") String tokenType,
        @JsonProperty("scope") String scope,
        @JsonProperty("expires_in") long expiresIn) {
}
