package ch.sofinco.core.observability;

/**
 * SPI minimaliste pour le comptage de métriques opérationnelles du bundle. Conçu volontairement
 * sans dépendance Micrometer/Dropwizard dans le module de base : la dépendance forte casserait
 * la portabilité OSGi du bundle entre clusters Jahia. À la place, on définit un contrat plat
 * que les ops peuvent câbler via OSGi DS sur l'infra de leur choix (Micrometer, Dropwizard,
 * StatsD, ou no-op en dev).
 *
 * <h2>Stratégie de câblage</h2>
 *
 * <p>Le service qui consomme cette interface la déclare {@code @Reference} en cardinalité
 * {@code OPTIONAL}. Si aucune impl n'est enregistrée, le service utilise {@link #NOOP} et le
 * code métier ne dévie pas (pas de branche {@code if (metrics != null)} partout).
 *
 * <h2>Nomenclature</h2>
 *
 * <p>Les noms de compteurs sont normalisés en kebab-case avec un préfixe par domaine
 * ({@code apim.}, {@code repex.}, {@code review.}). Les tags transmis sont libres mais
 * documentés dans chaque site d'appel.
 */
public interface MetricsRecorder {

    /** Impl no-op par défaut : utilisée si aucun bundle de métriques n'est déployé. */
    MetricsRecorder NOOP = (name, tagKeyValues) -> {
        // intentionnellement vide
    };

    /**
     * Incrémente un compteur monotone identifié par {@code name}. Les tags optionnels sont
     * passés en paires clé/valeur alternées ({@code "kind", "loan", "variant", "PB"}).
     *
     * <p>Aucun impact si {@code name} est blank, si la liste de tags est de longueur impaire,
     * ou si l'impl est {@link #NOOP}. Une impl ne doit pas lever d'exception (le path
     * d'observabilité ne doit jamais casser le path métier).
     */
    void increment(String name, String... tagKeyValues);
}
