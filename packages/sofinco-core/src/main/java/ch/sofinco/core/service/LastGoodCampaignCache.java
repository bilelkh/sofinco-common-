package ch.sofinco.core.service;

import ch.sofinco.core.model.representativeexample.CampaignResponse;
import net.sf.ehcache.Ehcache;
import net.sf.ehcache.Element;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/**
 * Cache des campagnes, lu à <b>deux fenêtres</b> — même politique que
 * {@link LastGoodExampleCache}, dont il partage la raison d'être.
 *
 * <ul>
 *   <li>{@link #getFresh} — fenêtre nominale : dédoublonne les appels entre pages partageant une
 *       provenance.</li>
 *   <li>{@link #get} — TTL complet, en secours quand l'APIM échoue. Les bornes de taux figurent
 *       dans des mentions légales : mieux vaut une valeur d'hier qu'un jeton brut affiché au
 *       visiteur.</li>
 * </ul>
 *
 * <p><b>Clé : la provenance seule</b>, là où l'exemple représentatif en compte cinq. Une campagne
 * ne dépend ni du montant ni de la durée — elle décrit ce que le produit autorise. D'où un taux de
 * réutilisation bien supérieur : une entrée par provenance pour tout le site.
 *
 * <p>Une {@code String} étant naturellement immuable, sérialisable et correctement hachée, il n'y a
 * pas de type {@code Key} dédié ici — en écrire un n'apporterait qu'une indirection.
 *
 * <p>Politique inchangée : seuls les succès sont mémorisés.
 */
final class LastGoodCampaignCache {

    private final Ehcache store;
    private final Duration ttl;
    private final Clock clock;

    LastGoodCampaignCache(Ehcache store, Duration ttl, Clock clock) {
        this.store = store;
        this.ttl = ttl;
        this.clock = clock;
    }

    /** Mémorise un résultat réussi. L'éviction au plafond est déléguée à ehcache (LRU). */
    void put(String sourceId, CampaignResponse value) {
        if (sourceId == null || value == null) {
            return;
        }
        var now = clock.instant();
        store.put(new Element(sourceId, new Entry(value, now, now.plus(ttl))));
    }

    /** Lecture de SECOURS : accepte toute entrée encore vivante au regard du TTL. */
    Optional<CampaignResponse> get(String sourceId) {
        var e = liveEntry(sourceId);
        return e != null ? Optional.of(e.value) : Optional.empty();
    }

    /**
     * Lecture NOMINALE : n'accepte que ce qui est plus récent que {@code maxAge}.
     *
     * @param maxAge fenêtre de fraîcheur ; {@code null} ou nulle désactive le dédoublonnage
     */
    Optional<CampaignResponse> getFresh(String sourceId, Duration maxAge) {
        if (maxAge == null) {
            return Optional.empty();
        }
        var e = liveEntry(sourceId);
        if (e == null || clock.instant().isAfter(e.storedAt.plus(maxAge))) {
            return Optional.empty();
        }
        return Optional.of(e.value);
    }

    private Entry liveEntry(String sourceId) {
        if (sourceId == null) {
            return null;
        }
        Element element = store.get(sourceId);
        if (element == null) {
            return null;
        }
        Entry e = (Entry) element.getObjectValue();
        if (e == null || clock.instant().isAfter(e.expiresAt)) {
            store.remove(sourceId);
            return null;
        }
        return e;
    }

    /**
     * Valeur mémorisée. <b>Volontairement NON {@code Serializable}</b>, comme son homologue de
     * l'exemple représentatif : le cache est créé sans réplicateur, et annoncer une sérialisation
     * qui échouerait à l'exécution serait un mensonge que le compilateur ne peut pas relever.
     */
    private static final class Entry {

        private final CampaignResponse value;
        private final Instant storedAt;
        private final Instant expiresAt;

        Entry(CampaignResponse value, Instant storedAt, Instant expiresAt) {
            this.value = value;
            this.storedAt = storedAt;
            this.expiresAt = expiresAt;
        }
    }
}
