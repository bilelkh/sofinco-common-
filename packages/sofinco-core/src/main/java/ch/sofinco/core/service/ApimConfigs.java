package ch.sofinco.core.service;

import ch.sofinco.core.config.ApimConfig;
import ch.sofinco.core.util.SecurityChecks;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Locale;

/**
 * Lecture, nettoyage et contrôle des valeurs de configuration APIM.
 *
 * <p>Séparé de {@code ApimServiceImpl}, qui gère un cycle de vie OSGi et un client HTTP : décider
 * si une URL est acceptable ou si une chaîne traîne un espace insécable n'a rien à voir avec l'un
 * ni avec l'autre. Utilitaire statique — aucun état.
 */
final class ApimConfigs {

    private static final Logger LOG = LoggerFactory.getLogger(ApimConfigs.class);

    private ApimConfigs() {
        // util statique
    }

    static boolean hasMandatoryFields(ApimConfig cfg) {
        return cfg != null
                && StringUtils.isNotBlank(cfg.apimApiUrl())
                && StringUtils.isNotBlank(cfg.apimClientKey());
    }

    /**
     * Lit une string de config en strippant tout whitespace, y compris les espaces non
     * sécables (NBSP). Indispensable car les variables d'environnement Docker arrivent
     * fréquemment avec un espace de fin (heredocs, fichiers {@code .env} CRLF), et le
     * copier-coller depuis Word/Office/PDF/Web introduit fréquemment des NBSP. La
     * concaténation directe {@code apimApiUrl + path} produirait alors une URL malformée du
     * type {@code "https://host.fr /loanSimulation/..."} qui ferait planter
     * {@code URI.create()} en aval et déclencherait à tort le fail-closed
     * {@link SecurityChecks}.
     *
     * <p><b>Gotcha JDK</b> : {@link String#strip()} ne traite PAS les NBSP car
     * {@link Character#isWhitespace(int)} retourne {@code false} pour
     * {@code U+00A0} (NO-BREAK SPACE), {@code U+2007} (FIGURE SPACE) et
     * {@code U+202F} (NARROW NO-BREAK SPACE).
     *
     * <p>Visible package pour tests.
     */
    static String cleanConfigString(String raw) {
        if (raw == null) {
            return "";
        }
        // Strip large : combine Character.isWhitespace (espaces classiques, tabs, CR/LF)
        // ET Character.isSpaceChar (NBSP U+00A0, FIGURE SPACE U+2007, NARROW NBSP U+202F),
        // que String.strip() rate par contrat JDK. Couvre tous les cas observés en prod
        // (Docker .env CRLF, copier-coller Word/PDF, devis FR financier).
        var start = 0;
        int end = raw.length();
        while (start < end && isStripChar(raw.charAt(start))) {
            start++;
        }
        while (end > start && isStripChar(raw.charAt(end - 1))) {
            end--;
        }
        return raw.substring(start, end);
    }

    /**
     * {@code true} si le caractère doit être strippé en bord. Combine
     * {@link Character#isWhitespace(char)} (espaces classiques, tab, CR/LF) et
     * {@link Character#isSpaceChar(char)} (NBSP famille, que {@code isWhitespace} ignore).
     * Visible package pour tests.
     */
    static boolean isStripChar(char c) {
        return Character.isWhitespace(c) || Character.isSpaceChar(c);
    }

    /**
     * Alerte explicite quand une valeur de config charge avec un whitespace (espace, tab, CR/LF,
     * NBSP). Cas typiques : variable d'environnement Docker depuis un {@code .env} CRLF,
     * heredoc shell, ou copier-coller depuis Word/Office/PDF/Web (introduit des NBSP).
     * Symptôme observé en prod : URL malformée du type {@code "https://host.fr /loanSimulation/..."},
     * fail-closed {@link SecurityChecks}, et erreur trompeuse « Bearer en clair ». Le bundle
     * nettoie silencieusement via {@link #cleanConfigString(String)}, ce log signale aux ops
     * de corriger à la source.
     */
    static void warnIfWhitespaceInConfig(ApimConfig cfg, String origin) {
        warnIfDirty("apimApiUrl", cfg.apimApiUrl(), origin);
        warnIfDirty("apimOrigin", cfg.apimOrigin(), origin);
        warnIfDirty("partnerId", cfg.partnerId(), origin);
        warnIfDirty("apimClientKey", cfg.apimClientKey(), origin);
    }

    private static void warnIfDirty(String fieldName, String raw, String origin) {
        if (raw == null) {
            return;
        }
        // Utilise cleanConfigString (couvre aussi NBSP) plutôt qu'un raw.strip() naïf qui
        // raterait U+00A0 / U+2007 / U+202F et n'émettrait pas de WARN sur ces cas.
        var cleaned = cleanConfigString(raw);
        if (!cleaned.equals(raw)) {
            // Ne JAMAIS logger la valeur brute (peut contenir apimClientKey) — on signale juste
            // la longueur cleanée vs brute pour aider au diagnostic.
            LOG.warn("ApimService [{}] : config {} contient des espaces parasites "
                    + "(raw_len={} cleaned_len={}). Le bundle nettoie silencieusement, "
                    + "mais corriger la source (Docker .env CRLF, heredoc, copier-coller).",
                    origin, fieldName, raw.length(), cleaned.length());
        }
    }

    /** Logge en ERROR l'URL APIM en HTTP non-loopback. Visible package pour tests. */
    static void validateHttpsForProduction(ApimConfig cfg) {
        // Strip avant validation : sinon une URL bavante d'espace serait classée fail-closed
        // alors que l'intention est correcte (juste un trim manquant côté config).
        validateHttpsUrl(cleanConfigString(cfg.apimApiUrl()), "apimApiUrl");
    }

    private static void validateHttpsUrl(String url, String fieldName) {
        if (StringUtils.isBlank(url)) {
            return;
        }
        if (!SecurityChecks.isInsecureHttpNonLocal(url)) {
            if (url.toLowerCase(Locale.ROOT).startsWith("http://")) {
                LOG.debug("APIM {} en HTTP sur loopback ({}) — accepté en dev local", fieldName, url);
            }
            return;
        }
        LOG.error("⚠ SECURITY: APIM {} en HTTP non-local : {} — credentials et tokens "
                + "seront transmis en clair. Corriger en HTTPS.", fieldName, url);
    }
}
