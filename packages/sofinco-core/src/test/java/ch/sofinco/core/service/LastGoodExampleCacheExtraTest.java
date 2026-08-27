package ch.sofinco.core.service;

import ch.sofinco.core.enums.CreditVariant;
import ch.sofinco.core.model.representativeexample.RepresentativeExample;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Cas additionnels pour {@link LastGoodExampleCache} : isolation des clés, concurrence,
 * remplacement à la même clé, expiration partielle dans un cache plein.
 */
class LastGoodExampleCacheExtraTest {

    private static final RepresentativeExample EX_A = new RepresentativeExample(
            CreditVariant.PRET_PERSO, "PBPERSO", "15 000 €", Collections.emptyList(),
            Collections.emptyMap(), null);
    private static final RepresentativeExample EX_B = new RepresentativeExample(
            CreditVariant.CREDIT_RENOUVELABLE, "RESERVE", "3 000 €", Collections.emptyList(),
            Collections.emptyMap(), null);

    // ----------------------------------------------------------------- isolation des clés

    @Test
    void differentVariants_areIsolated() {
        LastGoodExampleCache cache = RepexFixtures.newCache(Duration.ofMinutes(30), 256, Clock.systemUTC());
        LastGoodExampleCache.Key kPb = key(CreditVariant.PRET_PERSO, "src", 1L, 1L, "o");
        LastGoodExampleCache.Key kCr = key(CreditVariant.CREDIT_RENOUVELABLE, "src", 1L, 1L, "o");

        cache.put(kPb, EX_A);
        cache.put(kCr, EX_B);

        assertThat(cache.get(kPb)).contains(EX_A);
        assertThat(cache.get(kCr)).contains(EX_B);
        assertThat(cache.size()).isEqualTo(2);
    }

    @Test
    void differentSourceCodes_areIsolated() {
        LastGoodExampleCache cache = RepexFixtures.newCache(Duration.ofMinutes(30), 256, Clock.systemUTC());
        cache.put(key(CreditVariant.PRET_PERSO, "src1", 1L, 1L, "o"), EX_A);
        cache.put(key(CreditVariant.PRET_PERSO, "src2", 1L, 1L, "o"), EX_B);

        assertThat(cache.get(key(CreditVariant.PRET_PERSO, "src1", 1L, 1L, "o"))).contains(EX_A);
        assertThat(cache.get(key(CreditVariant.PRET_PERSO, "src2", 1L, 1L, "o"))).contains(EX_B);
    }

    @Test
    void differentAmounts_areIsolated() {
        LastGoodExampleCache cache = RepexFixtures.newCache(Duration.ofMinutes(30), 256, Clock.systemUTC());
        cache.put(key(CreditVariant.PRET_PERSO, "src", 15000L, 48L, "o"), EX_A);
        cache.put(key(CreditVariant.PRET_PERSO, "src", 30000L, 48L, "o"), EX_B);

        assertThat(cache.get(key(CreditVariant.PRET_PERSO, "src", 15000L, 48L, "o"))).contains(EX_A);
        assertThat(cache.get(key(CreditVariant.PRET_PERSO, "src", 30000L, 48L, "o"))).contains(EX_B);
    }

    @Test
    void differentOrigins_areIsolated() {
        // Un last-good obtenu pour Origin A ne doit pas être resservi à Origin B (les bareme codes
        // peuvent différer par client).
        LastGoodExampleCache cache = RepexFixtures.newCache(Duration.ofMinutes(30), 256, Clock.systemUTC());
        cache.put(key(CreditVariant.PRET_PERSO, "src", 1L, 1L, "https://www.sofinco.fr"), EX_A);
        cache.put(key(CreditVariant.PRET_PERSO, "src", 1L, 1L, "https://other.partner.com"), EX_B);

        assertThat(cache.get(key(CreditVariant.PRET_PERSO, "src", 1L, 1L, "https://www.sofinco.fr")))
                .contains(EX_A);
    }

    /**
     * Le barème entre dans la clé : un même sourceCode simulé sur deux barèmes donne deux
     * mensualités différentes. {@code equals}/{@code hashCode} de {@link LastGoodExampleCache.Key}
     * sont écrits à la main — un champ oublié y resservirait silencieusement le mauvais exemple.
     */
    @Test
    void differentScaleCodes_areIsolated() {
        LastGoodExampleCache cache = RepexFixtures.newCache(Duration.ofMinutes(30), 256, Clock.systemUTC());

        cache.put(keyWithScaleCode("CRBP"), EX_A);

        assertThat(cache.get(keyWithScaleCode("CRBP"))).contains(EX_A);
        assertThat(cache.get(keyWithScaleCode("CRBP2"))).isEmpty();
        assertThat(cache.get(keyWithScaleCode(null))).isEmpty();
    }

    @Test
    void nullOriginDistinct_fromBlankOrigin() {
        // null != "" en termes de clé.
        LastGoodExampleCache cache = RepexFixtures.newCache(Duration.ofMinutes(30), 256, Clock.systemUTC());
        cache.put(key(CreditVariant.PRET_PERSO, "src", 1L, 1L, null), EX_A);

        assertThat(cache.get(key(CreditVariant.PRET_PERSO, "src", 1L, 1L, null))).contains(EX_A);
        assertThat(cache.get(key(CreditVariant.PRET_PERSO, "src", 1L, 1L, ""))).isEmpty();
    }

    // ----------------------------------------------------------------- update

    @Test
    void put_sameKey_replacesAndResetsTtl() {
        ControlClock clock = new ControlClock(Instant.parse("2026-06-17T10:00:00Z"));
        LastGoodExampleCache cache = RepexFixtures.newCache(Duration.ofMinutes(30), 256, clock);
        LastGoodExampleCache.Key k = key(CreditVariant.PRET_PERSO, "src", 1L, 1L, "o");

        cache.put(k, EX_A);
        clock.advance(Duration.ofMinutes(25)); // T+25min, l'entrée A expire à T+30min
        cache.put(k, EX_B);                    // remplace par B, expiration T+25+30 = T+55min
        clock.advance(Duration.ofMinutes(10)); // T+35min
        // A serait expirée, mais B reste valide jusqu'à T+55min.
        assertThat(cache.get(k)).contains(EX_B);
    }

    // ----------------------------------------------------------------- éviction par expiration

    /**
     * Deux responsabilités désormais séparées : ehcache tient la PLACE (plafond, LRU, TTL mural),
     * nous tenons l'ANCIENNETÉ ({@code expiresAt} sur une horloge injectable). L'expiration est
     * donc paresseuse — constatée et purgée à la lecture, pas balayée à l'écriture.
     */
    @Test
    void expiredEntriesAreNeverServed_andArePurgedOnAccess() {
        ControlClock clock = new ControlClock(Instant.parse("2026-06-17T10:00:00Z"));
        LastGoodExampleCache cache = RepexFixtures.newCache(Duration.ofMinutes(30), 8, clock);

        LastGoodExampleCache.Key old = key(CreditVariant.PRET_PERSO, "S1", 1L, 1L, "o");
        cache.put(old, EX_A);
        clock.advance(Duration.ofMinutes(31));

        LastGoodExampleCache.Key fresh = key(CreditVariant.PRET_PERSO, "S3", 1L, 1L, "o");
        cache.put(fresh, EX_B);

        assertThat(cache.get(old)).isEmpty();
        assertThat(cache.get(fresh)).contains(EX_B);
        assertThat(cache.size()).isEqualTo(1); // l'expirée a été retirée à la lecture
    }

    // ----------------------------------------------------------------- concurrence

    @Test
    void concurrentPutsOnDistinctKeys_allSucceed() throws Exception {
        LastGoodExampleCache cache = RepexFixtures.newCache(Duration.ofMinutes(30), 1024, Clock.systemUTC());

        int n = 50;
        ExecutorService pool = Executors.newFixedThreadPool(8);
        CountDownLatch ready = new CountDownLatch(1);
        try {
            var futures = IntStream.range(0, n)
                    .mapToObj(i -> pool.submit(() -> {
                        ready.await();
                        cache.put(key(CreditVariant.PRET_PERSO, "src-" + i, 1L, 1L, "o"), EX_A);
                        return null;
                    }))
                    .toList();
            ready.countDown();
            for (Future<?> f : futures) {
                f.get(5, TimeUnit.SECONDS);
            }
            assertThat(cache.size()).isEqualTo(n);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void concurrentReadsAndWrites_remainConsistent() throws Exception {
        LastGoodExampleCache cache = RepexFixtures.newCache(Duration.ofMinutes(30), 1024, Clock.systemUTC());
        LastGoodExampleCache.Key sharedKey = key(CreditVariant.PRET_PERSO, "src", 1L, 1L, "o");
        cache.put(sharedKey, EX_A);

        int n = 100;
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            var futures = IntStream.range(0, n)
                    .mapToObj(i -> pool.submit(() -> {
                        if (i % 3 == 0) {
                            cache.put(sharedKey, EX_A);
                        } else {
                            cache.get(sharedKey);
                        }
                        return null;
                    }))
                    .toList();
            for (Future<?> f : futures) {
                f.get(5, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }
        // Pas d'exception observée → ConcurrentHashMap a tenu son contrat thread-safe.
        assertThat(cache.get(sharedKey)).contains(EX_A);
    }

    // ----------------------------------------------------------------- helpers

    /**
     * Barème et {@code insuranceTextOverride} restent nuls : ils sont fixes pour tous les cas de
     * ce fichier. Leur rôle dans la clé est couvert par {@link #differentScaleCodes_areIsolated}
     * et par {@code LastGoodExampleCacheFreshTest#insuranceTextOverride_isolatesEntries}.
     */
    private static LastGoodExampleCache.Key key(CreditVariant variant, String src,
                                                long amount, long duration, String origin) {
        return new LastGoodExampleCache.Key(variant, src, amount, duration, null, origin, null);
    }

    private static LastGoodExampleCache.Key keyWithScaleCode(String scaleCode) {
        return new LastGoodExampleCache.Key(CreditVariant.PRET_PERSO, "src", 1L, 1L, scaleCode,
                "o", null);
    }

    private static final class ControlClock extends Clock {
        private Instant now;
        ControlClock(Instant initial) { this.now = initial; }
        void advance(Duration d) { this.now = this.now.plus(d); }
        @Override public Instant instant() { return now; }
        @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId z) { return this; }
    }
}
