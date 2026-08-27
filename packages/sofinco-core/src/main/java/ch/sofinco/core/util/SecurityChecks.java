package ch.sofinco.core.util;

import org.apache.commons.lang3.StringUtils;

import java.net.URI;
import java.util.Locale;

/**
 * Helpers de sécurité réseau partagés. Centralise la détection HTTP non-loopback pour qu'une
 * évolution de politique soit faite en un seul endroit. Non instanciable.
 */
public final class SecurityChecks {

    private SecurityChecks() {
        // util statique
    }

    /**
     * {@code true} si l'URL est en {@code http://} non-loopback (à refuser pour les flux
     * portant des credentials).
     *
     * <p>Compare l'<b>hôte réel</b> extrait via {@link URI}, pas une sous-chaîne — l'ancien
     * {@code url.contains("://localhost")} acceptait des hôtes attaquants comme
     * {@code http://localhost.attaquant.com}.
     *
     * <p>Reconnaît {@code localhost}, {@code 127.0.0.1}, {@code ::1}, {@code [::1]}.
     * URL non parsable ou hôte absent → <b>fail-closed</b> (retourne {@code true}).
     */
    public static boolean isInsecureHttpNonLocal(String url) {
        if (StringUtils.isBlank(url)) {
            return false;
        }

        final URI uri;
        try {
            uri = URI.create(url.trim());
        } catch (IllegalArgumentException malformed) {
            return true; // fail-closed
        }

        String scheme = uri.getScheme();
        if (scheme == null || !"http".equalsIgnoreCase(scheme)) {
            return false; // https ou schème non concerné
        }

        String host = uri.getHost();
        if (host == null) {
            return true; // fail-closed
        }

        String lowerHost = host.toLowerCase(Locale.ROOT);
        boolean loopback = "localhost".equals(lowerHost)
                || "127.0.0.1".equals(lowerHost)
                || "[::1]".equals(lowerHost)
                || "::1".equals(lowerHost);
        return !loopback;
    }
}
