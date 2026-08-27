package ch.sofinco.core.validation.simulation;

import ch.sofinco.core.model.representativeexample.CampaignResponse;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Mémorisation courte des verdicts de validation.
 *
 * <p>Le comportement qui compte n'est pas « ça met en cache » mais <b>ce qui n'est jamais mis en
 * cache</b> : un verdict {@code UNAVAILABLE}. Le retenir ferait ignorer un APIM revenu en ligne
 * pendant toute la durée de vie de l'entrée.
 */
class CampaignVerdictCacheTest {

    private final ControlClock clock = new ControlClock();
    private final CampaignVerdictCache cache = new CampaignVerdictCache(clock);

    private static CampaignLookup found() {
        CampaignResponse campaign = new CampaignResponse("NEOURL41", "loan", "PRÊT PERSONNEL",
                3001.0, 75000.0, 12, 120, null, null, null, null, null, null, null);
        return CampaignLookup.forFound(campaign);
    }

    private static CampaignLookup unknown() {
        return CampaignLookup.forUnknownSource();
    }

    private static CampaignLookup unavailable() {
        return CampaignLookup.forUnavailable();
    }

    // ------------------------------------------------------------------ mémorisation

    @Test
    void anUnknownSourceIsNotCachedBeforeItIsStored() {
        assertThat(cache.get("NEOURL41")).isNull();
    }

    @Test
    void aFoundVerdictIsServedFromMemory() {
        cache.put("NEOURL41", found());

        CampaignLookup memorized = cache.get("NEOURL41");
        assertThat(memorized).isNotNull();
        assertThat(memorized.status()).isEqualTo(CampaignLookup.Status.FOUND);
        assertThat(memorized.campaign().id()).isEqualTo("NEOURL41");
    }

    /** Un refus se mémorise aussi : c'est le cas d'une migration qui rejoue la même faute. */
    @Test
    void anUnknownSourceVerdictIsAlsoMemorized() {
        cache.put("XXXX", unknown());

        assertThat(cache.get("XXXX")).isNotNull()
                .extracting(CampaignLookup::status)
                .isEqualTo(CampaignLookup.Status.UNKNOWN_SOURCE);
    }

    /**
     * LE comportement qui justifie ce fichier. « Je ne sais pas » ne se mémorise pas : sans quoi un
     * APIM revenu en ligne resterait ignoré jusqu'à expiration de l'entrée.
     */
    @Test
    void anUnavailableVerdictIsNeverMemorized() {
        cache.put("NEOURL41", unavailable());

        assertThat(cache.get("NEOURL41")).isNull();
        assertThat(cache.size()).isZero();
    }

    @Test
    void nullArgumentsAreIgnored() {
        cache.put(null, found());
        cache.put("NEOURL41", null);

        assertThat(cache.size()).isZero();
        assertThat(cache.get(null)).isNull();
    }

    // ------------------------------------------------------------------ expiration

    @Test
    void anEntryExpiresAfterItsTtl() {
        cache.put("NEOURL41", found());
        clock.advance(CampaignVerdictCache.TTL.minusSeconds(1));
        assertThat(cache.get("NEOURL41")).as("encore dans la fenêtre").isNotNull();

        clock.advance(Duration.ofSeconds(2));
        assertThat(cache.get("NEOURL41")).as("au-delà de la fenêtre").isNull();
    }

    /** L'entrée périmée est retirée à la lecture : la table ne garde pas de résidus. */
    @Test
    void anExpiredEntryIsEvictedOnRead() {
        cache.put("NEOURL41", found());
        clock.advance(CampaignVerdictCache.TTL.plusSeconds(1));

        cache.get("NEOURL41");
        assertThat(cache.size()).isZero();
    }

    // ------------------------------------------------------------------ plafond

    /**
     * Plafond de sécurité : il ne protège pas d'un usage normal — les provenances se comptent sur
     * les doigts d'une main — mais d'un script écrivant des provenances aléatoires, qui ferait
     * grandir la table sans fin dans un processus de longue durée.
     */
    @Test
    void theTableIsBounded() {
        for (int i = 0; i < CampaignVerdictCache.MAX_ENTRIES + 5; i++) {
            cache.put("SOURCE-" + i, found());
        }
        assertThat(cache.size()).isLessThanOrEqualTo(CampaignVerdictCache.MAX_ENTRIES);
    }

    @Test
    void clearEmptiesTheTable() {
        cache.put("NEOURL41", found());
        cache.clear();
        assertThat(cache.size()).isZero();
    }

    // ------------------------------------------------------------------ horloge

    /** Horloge pilotée : teste les fenêtres sans {@code Thread.sleep}. */
    private static final class ControlClock extends Clock {
        private Instant now = Instant.parse("2026-08-19T10:00:00Z");

        void advance(Duration by) {
            now = now.plus(by);
        }

        @Override
        public Instant instant() {
            return now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }
    }
}
