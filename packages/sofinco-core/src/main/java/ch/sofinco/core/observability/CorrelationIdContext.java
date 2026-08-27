package ch.sofinco.core.observability;

import org.slf4j.MDC;

import java.util.UUID;

/**
 * Helper pour la propagation d'un identifiant de corrélation à travers la chaîne
 * bridge → service → client → executor via le MDC SLF4J.
 *
 * <p>Chaque entrée publique du bundle (bridge) ouvre un scope avec {@link #open()} ou
 * {@link #openWith(String)} et le ferme via {@code try-with-resources}. Tous les logs émis
 * pendant le scope auront automatiquement le tag {@code correlationId=...} (via le pattern
 * %X{correlationId} configuré côté pax-logging), ce qui rend les simulations échouées
 * traçables de bout en bout.
 *
 * <p>Le scope préserve l'éventuel correlationId déjà présent (cas d'un appel imbriqué ou
 * d'un contexte HTTP qui aurait déjà posé une valeur) et le restaure à la fermeture.
 *
 * <h2>Usage</h2>
 *
 * <pre>{@code
 * try (CorrelationIdContext.Scope scope = CorrelationIdContext.open()) {
 *     // Tous les logs ici porteront correlationId=<UUID>
 *     service.getExample(request);
 * }
 * }</pre>
 */
public final class CorrelationIdContext {

    /** Clé MDC normalisée — alignée avec la convention SLF4J/pax-logging du portail. */
    public static final String MDC_KEY = "correlationId";

    private CorrelationIdContext() {
        // util statique
    }

    /** Ouvre un scope avec un UUID frais. */
    public static Scope open() {
        return openWith(UUID.randomUUID().toString());
    }

    /**
     * Ouvre un scope avec un identifiant explicite. Si {@code correlationId} est {@code null}
     * ou blank, on retombe sur un UUID frais.
     */
    public static Scope openWith(String correlationId) {
        String effective = (correlationId == null || correlationId.isBlank())
                ? UUID.randomUUID().toString()
                : correlationId;
        String previous = MDC.get(MDC_KEY);
        MDC.put(MDC_KEY, effective);
        return new Scope(effective, previous);
    }

    /** Lit la valeur courante du correlationId MDC, ou {@code null} si pas en scope. */
    public static String current() {
        return MDC.get(MDC_KEY);
    }

    /**
     * Handle AutoCloseable du scope. Restaure la valeur précédente du MDC à la fermeture
     * (préserve les contextes imbriqués). {@code close()} idempotent.
     */
    public static final class Scope implements AutoCloseable {

        private final String correlationId;
        private final String previous;
        private boolean closed;

        Scope(String correlationId, String previous) {
            this.correlationId = correlationId;
            this.previous = previous;
        }

        public String correlationId() {
            return correlationId;
        }

        @Override
        public void close() {
            if (closed) {
                return;
            }
            closed = true;
            if (previous != null) {
                MDC.put(MDC_KEY, previous);
            } else {
                MDC.remove(MDC_KEY);
            }
        }
    }
}
