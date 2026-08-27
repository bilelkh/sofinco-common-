package ch.sofinco.core.model.apim;

import ch.sofinco.core.util.JsonFacade;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;

import java.util.List;

/**
 * Parse les réponses d'erreur de l'APIM Sofinco (codes 400, 401, 403, 500).
 *
 * <p>⚠ Plusieurs formats observés en recette, gérés par {@link #tryParse} (premier qui matche) :
 * <ul>
 *   <li>Objet seul {@code {code, shortlib, longlib, ...}} (Swagger)</li>
 *   <li>Array d'objets {@code [{code, shortlib}]} (401 UOM_JWT_VALIDATION_ERROR)</li>
 *   <li>WSO2 nested {@code {fault: {code, message, description}}} (401 Invalid Credentials)</li>
 * </ul>
 *
 * <p>Désérialisation via {@link JsonFacade} — pas d'{@code ObjectMapper} passé en paramètre
 * (alignement avec la façade unique du bundle).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ApimError(
        @JsonProperty("code") String code,
        @JsonProperty("shortlib") String shortlib,
        @JsonProperty("longlib") String longlib,
        @JsonProperty("lib") String lib,
        @JsonProperty("message") String message,
        @JsonProperty("description") String description,
        @JsonProperty("uriDesc") String uriDesc,
        @JsonProperty("errorsValueList") List<String> errorsValueList) {

    public ApimError {
        errorsValueList = errorsValueList != null ? errorsValueList : List.of();
    }

    /** Combine les champs en un message synthétique pour les logs. */
    public String summary() {
        var sb = new StringBuilder();
        if (code != null) {
            sb.append(code);
        }
        String mainMsg = firstNonNull(shortlib, message, longlib, lib);
        if (mainMsg != null) {
            if (!sb.isEmpty()) {
                sb.append(": ");
            }
            sb.append(mainMsg);
        }
        return sb.isEmpty() ? "(no error details)" : sb.toString();
    }

    /**
     * Tente le parse des 3 formats successivement.
     *
     * @return ApimError reconstruit, ou null si le body ne matche aucun format connu
     */
    public static ApimError tryParse(String body) {
        if (body == null || body.isEmpty()) {
            return null;
        }
        String trimmed = body.trim();

        // Format 1 : array [{...}]
        if (trimmed.startsWith("[")) {
            try {
                ApimError[] arr = JsonFacade.readValue(body, ApimError[].class);
                return arr.length > 0 ? arr[0] : null;
            } catch (JsonProcessingException ignored) { /* fall through */ }
        }

        // Format 2 : enveloppe WSO2, avec l'erreur imbriquée sous la clé "fault".
        if (trimmed.contains("\"fault\"")) {
            try {
                Wso2Wrapper w = JsonFacade.readValue(body, Wso2Wrapper.class);
                return w != null ? w.fault() : null;
            } catch (JsonProcessingException ignored) { /* fall through */ }
        }

        // Format 3 : objet JSON unique, non enveloppé.
        try {
            return JsonFacade.readValue(body, ApimError.class);
        } catch (JsonProcessingException ignored) {
            return null;
        }
    }

    private static String firstNonNull(String... values) {
        for (String v : values) {
            if (v != null) {
                return v;
            }
        }
        return null;
    }

    /** Wrapper interne pour le format WSO2 {"fault": {code, message, description}}. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Wso2Wrapper(@JsonProperty("fault") ApimError fault) {
    }
}
