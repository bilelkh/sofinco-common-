package ch.sofinco.core.cache;

import net.sf.ehcache.Ehcache;
import net.sf.ehcache.Element;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * Cache à fenêtre unique, <b>capable de mémoriser un échec</b>.
 *
 * <p>À rapprocher de {@code LastGoodExampleCache}, qui partage la forme — magasin ehcache,
 * {@code expiresAt} mesuré par nos soins via une {@link Clock} injectable — mais pas la politique :
 * l'exemple représentatif lit à deux fenêtres et ne mémorise que les succès, parce qu'une mention
 * légale obligatoire ne doit pas disparaître sur un incident. Ici, à l'inverse, on veut
 * explicitement retenir l'échec sur une fenêtre courte, pour cesser de marteler un amont mort.
 *
 * <p><b>D'où {@link Hit}.</b> Une valeur mémorisée peut légitimement être {@code null} (« l'amont
 * n'a rien à dire »), et {@code null} signifie déjà « absent » du côté du magasin. Le porteur lève
 * l'ambiguïté : {@code hit(...) == null} veut dire absent ou périmé, {@code hit.value() == null}
 * veut dire mémorisé à vide. Un appelant qui testerait {@code valeur != null} pour décider de
 * rappeler l'amont perdrait tout le cache d'échec — c'est le seul contresens possible sur cette
 * classe.
 *
 * <p>Plusieurs instances peuvent partager un même magasin : le {@code keyPrefix} sépare les
 * espaces de clés, ce qui évite d'ouvrir un cache ehcache par type de valeur.
 *
 * @param <V> type de la valeur mémorisée
 */
public final class TtlCache<V> {

    private final Ehcache store;
    private final String keyPrefix;
    private final Clock clock;

    public TtlCache(Ehcache store, String keyPrefix, Clock clock) {
        this.store = store;
        this.keyPrefix = keyPrefix;
        this.clock = clock;
    }

    /**
     * Mémorise une valeur — succès comme échec — pour la durée donnée.
     *
     * <p>L'éviction quand le plafond est atteint est déléguée à ehcache (LRU). Un {@code ttl} nul
     * ou négatif désactive la mémorisation pour cet appel plutôt que d'écrire une entrée déjà
     * périmée.
     */
    public void put(String key, V value, Duration ttl) {
        if (key == null || ttl == null || ttl.isZero() || ttl.isNegative()) {
            return;
        }
        store.put(new Element(keyPrefix + key, new Entry(value, clock.instant().plus(ttl))));
    }

    /**
     * Entrée servable, ou {@code null} si absente ou périmée. Purge au passage ce qui a expiré.
     *
     * <p>La valeur portée peut être {@code null} : c'est un échec mémorisé, pas une absence.
     */
    @SuppressWarnings("unchecked")
    public Hit<V> hit(String key) {
        if (key == null) {
            return null;
        }
        var element = store.get(keyPrefix + key);
        if (element == null) {
            return null;
        }
        Entry entry = (Entry) element.getObjectValue();
        if (entry == null || clock.instant().isAfter(entry.expiresAt())) {
            store.remove(keyPrefix + key);
            return null;
        }
        return new Hit<>((V) entry.value());
    }

    /** Visible pour tests. */
    public int size() {
        return store.getSize();
    }

    /**
     * Porteur d'une valeur servable. Son existence même est l'information : elle distingue
     * « rien en cache » de « caché à vide ».
     */
    public record Hit<V>(V value) {
    }

    /**
     * Entrée mémorisée. <b>Volontairement non {@code Serializable}</b>, comme celle de
     * {@code LastGoodExampleCache} : le cache est créé sans réplicateur (voir
     * {@link EhcacheStoreFactory}), aucune entrée ne transite donc sur le réseau. Le marqueur y
     * serait une promesse que rien ne vérifie. Les CLÉS, elles, sont des {@code String} — donc
     * sérialisables, ce qui suffit à la propagation des retraits en profil cluster.
     */
    private record Entry(Object value, Instant expiresAt) {
    }
}
