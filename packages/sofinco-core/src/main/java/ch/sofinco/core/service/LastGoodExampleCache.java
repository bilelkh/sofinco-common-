package ch.sofinco.core.service;

import ch.sofinco.core.enums.CreditVariant;
import ch.sofinco.core.model.representativeexample.RepresentativeExample;
import net.sf.ehcache.Ehcache;
import net.sf.ehcache.Element;

import java.io.Serial;
import java.io.Serializable;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/**
 * Cache des exemples représentatifs, lu à <b>deux fenêtres</b> distinctes.
 *
 * <ul>
 *   <li>{@link #getFresh} — fenêtre courte, sur le chemin nominal : dédoublonne les appels APIM
 *       identiques entre pages partageant la même configuration.</li>
 *   <li>{@link #get} — TTL complet, uniquement en secours quand l'APIM échoue. L'exemple est une
 *       mention légale obligatoire ; le fragment Jahia étant caché ≈ 1h, un incident transitoire
 *       pendant un cache-miss figerait sinon la vue dégradée pendant une heure.</li>
 * </ul>
 *
 * <p>Une entrée trop vieille pour la fenêtre courte reste servable en secours.
 *
 * <p><b>Stockage : un ehcache du {@code CacheManager} de Jahia.</b> L'ancienneté est mesurée par
 * nos soins ({@code storedAt} + {@link Clock} injectable) et non par l'expiration ehcache : deux
 * fenêtres de lecture sur un seul magasin ne s'expriment pas avec un TTL unique. Le TTL ehcache
 * reste posé comme filet mémoire, aligné sur la fenêtre de secours.
 *
 * <p>Bénéfice du magasin de plateforme : {@code CacheHelper.flushAllCaches} parcourt aussi
 * {@code CacheManager.getCacheNames()} et propage au cluster — « Vider tous les caches » atteint
 * donc ce cache nativement, sans mécanisme de détection. <b>Contrepartie :</b> une purge efface
 * aussi les entrées de secours.
 *
 * <p>Politique inchangée : seuls les succès sont mémorisés.
 */
final class LastGoodExampleCache {

    private final Ehcache store;
    private final Duration ttl;
    private final Clock clock;

    LastGoodExampleCache(Ehcache store, Duration ttl, Clock clock) {
        this.store = store;
        this.ttl = ttl;
        this.clock = clock;
    }

    /**
     * Mémorise un résultat réussi. L'éviction quand le plafond est atteint est déléguée à ehcache
     * (LRU) — préférable à l'ancien plafond souple, qui refusait les nouvelles entrées et gelait
     * donc le cache sur son contenu le plus ancien.
     */
    void put(Key key, RepresentativeExample value) {
        if (key == null || value == null) {
            return;
        }
        var now = clock.instant();
        store.put(new Element(key, new Entry(value, now, now.plus(ttl))));
    }

    /** Secours : tout ce qui n'a pas expiré, quelle que soit son ancienneté. */
    Optional<RepresentativeExample> get(Key key) {
        var e = liveEntry(key);
        return e != null ? Optional.of(e.value) : Optional.empty();
    }

    /**
     * Chemin nominal : l'entrée n'est servie que si elle a été mémorisée il y a moins de
     * {@code maxAge}. Trop ancienne, elle est <b>conservée</b> — elle reste valide pour le secours.
     */
    Optional<RepresentativeExample> getFresh(Key key, Duration maxAge) {
        if (maxAge == null) {
            return Optional.empty();
        }
        var e = liveEntry(key);
        if (e == null || clock.instant().isAfter(e.storedAt.plus(maxAge))) {
            return Optional.empty();
        }
        return Optional.of(e.value());
    }

    /** Visible package pour tests. */
    int size() {
        return store.getSize();
    }

    /** Entrée non expirée, ou {@code null} — purge au passage ce qui a dépassé le TTL. */
    private Entry liveEntry(Key key) {
        if (key == null) {
            return null;
        }
        var element = store.get(key);
        if (element == null) {
            return null;
        }
        Entry e = (Entry) element.getObjectValue();
        if (e == null || clock.instant().isAfter(e.expiresAt())) {
            store.remove(key);
            return null;
        }
        return e;
    }

    /**
     * Valeur mémorisée. <b>Volontairement NON {@link Serializable}</b>, contrairement à la clé.
     *
     * <p>Le marqueur y serait un mensonge : {@code RepresentativeExample} n'est pas sérialisable
     * (cf. {@code ExampleCacheFactory}), donc toute sérialisation d'une entrée échouerait à
     * l'exécution quoi qu'annonce cette classe. Mieux vaut que le compilateur et le lecteur voient
     * la vérité — le cache est créé sans réplicateur précisément pour que ce cas n'arrive jamais.
     */
    private record Entry(RepresentativeExample value, Instant storedAt, Instant expiresAt) {
    }

    /**
     * Clé du cache : tout ce qui détermine le résultat. Immuable.
     *
     * <p>{@code insuranceTextOverride} en fait partie — il est lu sur le nœud de config <b>du
     * site</b> et entre dans l'objet construit. Sans lui, deux sites partageant un
     * {@code sourceCode} échangeraient leur texte d'assurance sur le chemin nominal.
     *
     * <p>Le mode mock n'y figure pas : le service ne mémorise rien en mock, de sorte qu'une
     * réponse fabriquée ne puisse pas survivre à un basculement vers l'APIM réel.
     *
     * <p>{@link Serializable} par prudence : le {@code defaultCache} du profil cluster attache un
     * réplicateur JGroups qui propage les retraits en n'envoyant que la CLÉ. Une clé non
     * sérialisable y échouerait à l'exécution, sur cluster uniquement — donc jamais en recette.
     */
    static final class Key implements Serializable {

        @Serial
        private static final long serialVersionUID = 1L;

        private final CreditVariant variant;
        private final String sourceCode;
        private final long amount;
        private final long duration;
        private final String scaleCode;
        private final String origin;
        private final String insuranceTextOverride;

        Key(CreditVariant variant, String sourceCode, long amount, long duration,
            String scaleCode, String origin, String insuranceTextOverride) {
            this.variant = variant;
            this.sourceCode = sourceCode;
            this.amount = amount;
            this.duration = duration;
            this.scaleCode = scaleCode;
            this.origin = origin;
            this.insuranceTextOverride = insuranceTextOverride;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof Key k)) {
                return false;
            }
            return amount == k.amount && duration == k.duration
                    && variant == k.variant
                    && Objects.equals(sourceCode, k.sourceCode)
                    && Objects.equals(scaleCode, k.scaleCode)
                    && Objects.equals(origin, k.origin)
                    && Objects.equals(insuranceTextOverride, k.insuranceTextOverride);
        }

        @Override
        public int hashCode() {
            return Objects.hash(variant, sourceCode, amount, duration, scaleCode, origin,
                    insuranceTextOverride);
        }
    }
}
