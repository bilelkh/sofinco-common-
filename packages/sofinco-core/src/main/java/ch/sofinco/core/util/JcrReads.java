package ch.sofinco.core.util;

import org.apache.commons.lang3.StringUtils;
import org.jahia.services.content.JCRNodeWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.RepositoryException;

/**
 * Lectures JCR null-safe partagées. Centralise {@code readString}/{@code readLong} (jadis
 * dupliqués dans le service et le bridge) et journalise les {@link RepositoryException} au lieu
 * de les avaler silencieusement.
 */
public final class JcrReads {

    private static final Logger LOG = LoggerFactory.getLogger(JcrReads.class);

    private JcrReads() {
        // util statique
    }

    /** Retourne la propriété String, ou {@code null} si absente/vide/illisible. */
    public static String readString(JCRNodeWrapper node, String prop) {
        if (node == null) {
            return null;
        }
        try {
            if (node.hasProperty(prop)) {
                var v = node.getProperty(prop).getString();
                return StringUtils.isBlank(v) ? null : v;
            }
        } catch (RepositoryException e) {
            LOG.debug("Lecture JCR String '{}' échouée : {}", prop, e.getMessage());
        }
        return null;
    }

    /** Retourne la propriété Long, ou {@code null} si absente/illisible. */
    public static Long readLong(JCRNodeWrapper node, String prop) {
        if (node == null) {
            return null;
        }
        try {
            if (node.hasProperty(prop)) {
                return node.getProperty(prop).getLong();
            }
        } catch (RepositoryException e) {
            LOG.debug("Lecture JCR Long '{}' échouée : {}", prop, e.getMessage());
        }
        return null;
    }

    /** Retourne la propriété Long, ou {@code fallback} si absente/illisible. */
    public static long readLongOr(JCRNodeWrapper node, String prop, long fallback) {
        var v = readLong(node, prop);
        return v != null ? v : fallback;
    }
}
