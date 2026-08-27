package ch.sofinco.core.util;

import java.util.regex.Pattern;

/**
 * Sanitisation défensive des contenus loggués contenant potentiellement des secrets.
 *
 * <p>Masque dans cet ordre :
 * <ol>
 *   <li>Caractères de contrôle — CR, LF, TAB — remplacés par une espace. Un message d'erreur
 *       portant du contenu distant (corps de réponse, page de login d'un proxy) peut sinon
 *       injecter de fausses lignes dans le journal : une ligne forgée y devient indiscernable
 *       d'une vraie (CWE-117). Un enregistrement = une ligne.</li>
 *   <li>Header {@code Authorization: Bearer/Basic <token>} (pattern dédié, schème conservé).</li>
 *   <li>{@code keyword=value} pour token/password/secret/cookie/session/access_token/
 *       client_secret/client_key/apikey/api_key. Word boundary {@code \b} en tête pour ne
 *       pas masquer {@code customerTokenList=42} business.</li>
 *   <li>UUIDs (potentiellement des access_token Sofinco) masqués <b>intégralement</b>
 *       — posture ACPR : aucun fragment de matériel secret en clair.</li>
 * </ol>
 *
 * <p>Fail-safe : null → "", regex error → "[log-sanitization-error]". Stateless, thread-safe.
 */
public final class LogSanitizer {

    /** CR / LF / TAB et autres caractères de contrôle — vecteur d'injection dans le journal. */
    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\p{Cntrl}]+");

    /** {@code Authorization: Bearer/Basic <token>} (schème séparé du token par espace). */
    private static final Pattern AUTHORIZATION_HEADER = Pattern.compile(
            "(?i)(authorization)[\"':=\\s]+(bearer|basic)\\s+[^\\s\"',;}\\)\\]]{1,500}");

    /** Patterns de clé sensible suivis d'une valeur. Word boundary anti faux-positif business. */
    private static final Pattern SENSITIVE_KEY_VALUE = Pattern.compile(
            "(?i)\\b(token|password|secret|cookie|session|access_token|client_secret|"
            + "client_key|apikey|api_key)[\"':=\\s]+[^\\s\"',;}\\)\\]]{1,200}");

    /** UUIDs au format standard (8-4-4-4-12 hex). */
    private static final Pattern UUID_PATTERN = Pattern.compile(
            "\\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\b",
            Pattern.CASE_INSENSITIVE);

    private static final String MASKED_REPLACEMENT = "$1=***MASKED***";
    private static final String MASKED_UUID = "********-****-****-****-************";

    private LogSanitizer() {
        // util statique
    }

    /** Tronque à {@code max} caractères avec suffixe {@code ...[truncated]}. Jamais null. */
    public static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max) + "...[truncated]";
    }

    /** Masque les valeurs sensibles. Voir Javadoc de classe pour l'ordre des règles. Jamais null. */
    public static String sanitize(String s) {
        if (s == null || s.isEmpty()) {
            return "";
        }
        try {
            // D'ABORD l'aplatissement : les patterns suivants raisonnent sur des séparateurs
            // d'espace, et un CR au milieu d'un `token=...` leur échapperait.
            String result = CONTROL_CHARS.matcher(s).replaceAll(" ");
            result = AUTHORIZATION_HEADER.matcher(result).replaceAll("$1=$2 ***MASKED***");
            result = SENSITIVE_KEY_VALUE.matcher(result).replaceAll(MASKED_REPLACEMENT);
            result = UUID_PATTERN.matcher(result).replaceAll(MASKED_UUID);
            return result;
        } catch (RuntimeException unexpectedRegexError) {
            return "[log-sanitization-error]";
        }
    }

    /**
     * Combine {@link #truncate} puis {@link #sanitize}. Ordre intentionnel : tronquer
     * d'abord évite de faire tourner la regex sur un body multi-MB.
     */
    public static String safeLog(String s, int max) {
        return sanitize(truncate(s, max));
    }
}
