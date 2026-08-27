package ch.sofinco.core.service;

import ch.sofinco.core.enums.CreditVariant;
import ch.sofinco.core.model.representativeexample.RepresentativeExample;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class LastGoodExampleCacheTest {

    private static final RepresentativeExample EXAMPLE = new RepresentativeExample(
            CreditVariant.PRET_PERSO, "PBPERSO", "15 000,00 €",
            Collections.emptyList(), Collections.emptyMap(), null);

    private final LastGoodExampleCache.Key key = new LastGoodExampleCache.Key(
            CreditVariant.PRET_PERSO, "NEOURL14", 15000L, 48L, null, "https://www.sofinco.fr", null);

    @Test
    void putThenGet_returnsValueWhenFresh() {
        ControlClock clock = new ControlClock(Instant.parse("2026-06-17T10:00:00Z"));
        LastGoodExampleCache cache = RepexFixtures.newCache(Duration.ofMinutes(30), 256, clock);
        cache.put(key, EXAMPLE);
        assertThat(cache.get(key)).contains(EXAMPLE);
    }

    @Test
    void get_returnsEmptyAfterTtl() {
        ControlClock clock = new ControlClock(Instant.parse("2026-06-17T10:00:00Z"));
        LastGoodExampleCache cache = RepexFixtures.newCache(Duration.ofMinutes(30), 256, clock);
        cache.put(key, EXAMPLE);
        clock.advance(Duration.ofMinutes(31));
        Optional<RepresentativeExample> got = cache.get(key);
        assertThat(got).isEmpty();
        // L'entrée expirée doit avoir été purgée
        assertThat(cache.size()).isZero();
    }

    @Test
    void get_returnsEmptyForUnknownKey() {
        LastGoodExampleCache cache = RepexFixtures.newCache(
                Duration.ofMinutes(30), 256, Clock.systemUTC());
        assertThat(cache.get(key)).isEmpty();
    }

    @Test
    void put_isNoOpWhenKeyOrValueIsNull() {
        LastGoodExampleCache cache = RepexFixtures.newCache(
                Duration.ofMinutes(30), 256, Clock.systemUTC());
        cache.put(null, EXAMPLE);
        cache.put(key, null);
        assertThat(cache.size()).isZero();
    }

    /**
     * Le plafond est désormais tenu par ehcache, en LRU. L'ancien plafond souple REFUSAIT les
     * nouvelles entrées une fois plein : le cache se figeait alors sur son contenu le plus ancien,
     * et une configuration nouvellement contribuée n'y entrait jamais. L'éviction est le bon
     * comportement.
     */
    @Test
    void put_evictsTheLeastRecentlyUsedOnceTheCapIsReached() {
        ControlClock clock = new ControlClock(Instant.parse("2026-06-17T10:00:00Z"));
        LastGoodExampleCache cache = RepexFixtures.newCache(Duration.ofMinutes(30), 2, clock);

        LastGoodExampleCache.Key last = new LastGoodExampleCache.Key(
                CreditVariant.PRET_PERSO, "S3", 1L, 1L, null, "o", null);

        cache.put(new LastGoodExampleCache.Key(
                CreditVariant.PRET_PERSO, "S1", 1L, 1L, null, "o", null), EXAMPLE);
        cache.put(new LastGoodExampleCache.Key(
                CreditVariant.PRET_PERSO, "S2", 1L, 1L, null, "o", null), EXAMPLE);
        cache.put(last, EXAMPLE);

        assertThat(cache.size()).isLessThanOrEqualTo(2);
        // La dernière écrite est présente — c'est ce qui distingue l'éviction du refus.
        assertThat(cache.get(last)).contains(EXAMPLE);
    }

    @Test
    void put_replacesExistingKeyEvenAtCap() {
        ControlClock clock = new ControlClock(Instant.parse("2026-06-17T10:00:00Z"));
        LastGoodExampleCache cache = RepexFixtures.newCache(Duration.ofMinutes(30), 1, clock);

        cache.put(key, EXAMPLE);
        assertThat(cache.size()).isEqualTo(1);
        // Même clé : autorisé même au cap.
        cache.put(key, EXAMPLE);
        assertThat(cache.size()).isEqualTo(1);
    }

    /** Horloge mutable pour avancer le temps dans les tests. */
    private static final class ControlClock extends Clock {
        private Instant now;

        ControlClock(Instant initial) {
            this.now = initial;
        }
        void advance(Duration d) { this.now = this.now.plus(d); }
        @Override public Instant instant()      { return now; }
        @Override public ZoneOffset getZone()   { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
    }
}
