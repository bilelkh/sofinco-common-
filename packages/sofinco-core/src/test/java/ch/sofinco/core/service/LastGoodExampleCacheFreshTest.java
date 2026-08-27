package ch.sofinco.core.service;

import ch.sofinco.core.enums.CreditVariant;
import ch.sofinco.core.model.representativeexample.RepresentativeExample;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.util.Collections;

import static ch.sofinco.core.service.RepexFixtures.ControlClock;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Les deux fenêtres de lecture : {@code getFresh} pour le chemin nominal, {@code get} pour le
 * secours. Elles lisent le même magasin avec des exigences d'ancienneté différentes.
 */
class LastGoodExampleCacheFreshTest {

    private static final Duration TTL = Duration.ofMinutes(30);
    private static final Duration WINDOW = Duration.ofSeconds(60);

    private static final RepresentativeExample EXAMPLE = new RepresentativeExample(
            CreditVariant.PRET_PERSO, "PBPERSO", "15 000 €", Collections.emptyList(),
            Collections.emptyMap(), null);

    // ------------------------------------------------------------------ fenêtre courte

    @Test
    void withinTheWindow_isServedOnTheNominalPath() {
        ControlClock clock = new ControlClock();
        LastGoodExampleCache cache = RepexFixtures.newCache(TTL, 256, clock);

        cache.put(key(), EXAMPLE);
        clock.advance(Duration.ofSeconds(59));

        assertThat(cache.getFresh(key(), WINDOW)).contains(EXAMPLE);
    }

    /**
     * Le test qui protège la conception : passé la fenêtre, l'entrée n'alimente plus le chemin
     * nominal mais reste servable en secours. La supprimer ferait perdre la résilience sur
     * incident APIM — une mention légale obligatoire disparaîtrait de la page.
     */
    @Test
    void pastTheWindow_leavesTheNominalPathButSurvivesForRescue() {
        ControlClock clock = new ControlClock();
        LastGoodExampleCache cache = RepexFixtures.newCache(TTL, 256, clock);

        cache.put(key(), EXAMPLE);
        clock.advance(Duration.ofSeconds(61));

        assertThat(cache.getFresh(key(), WINDOW)).isEmpty();
        assertThat(cache.get(key())).contains(EXAMPLE);
        assertThat(cache.size()).isEqualTo(1);
    }

    @Test
    void pastTheTtl_neitherWindowServes() {
        ControlClock clock = new ControlClock();
        LastGoodExampleCache cache = RepexFixtures.newCache(TTL, 256, clock);

        cache.put(key(), EXAMPLE);
        clock.advance(Duration.ofMinutes(31));

        assertThat(cache.getFresh(key(), WINDOW)).isEmpty();
        assertThat(cache.get(key())).isEmpty();
    }

    @Test
    void aNewPutRestartsTheWindow() {
        ControlClock clock = new ControlClock();
        LastGoodExampleCache cache = RepexFixtures.newCache(TTL, 256, clock);

        cache.put(key(), EXAMPLE);
        clock.advance(Duration.ofSeconds(90));
        cache.put(key(), EXAMPLE);

        assertThat(cache.getFresh(key(), WINDOW)).contains(EXAMPLE);
    }

    @Test
    void missingEntryOrNullArgument_yieldsEmpty() {
        LastGoodExampleCache cache = RepexFixtures.newCache(TTL, 256, Clock.systemUTC());

        assertThat(cache.getFresh(key(), WINDOW)).isEmpty();
        assertThat(cache.getFresh(null, WINDOW)).isEmpty();

        cache.put(key(), EXAMPLE);
        assertThat(cache.getFresh(key(), null)).isEmpty();
    }

    // ------------------------------------------------------------------ complétude de la clé

    /**
     * {@code insuranceTextOverride} est lu sur le nœud de config du SITE et entre dans l'objet
     * construit. Hors de la clé, deux sites partageant un {@code sourceCode} échangeraient leur
     * texte d'assurance dès que le cache est lu sur le chemin nominal.
     */
    @Test
    void insuranceTextOverride_isolatesEntries() {
        LastGoodExampleCache cache = RepexFixtures.newCache(TTL, 256, Clock.systemUTC());

        cache.put(key("Mention du site A"), EXAMPLE);

        assertThat(cache.getFresh(key("Mention du site A"), WINDOW)).contains(EXAMPLE);
        assertThat(cache.getFresh(key("Mention du site B"), WINDOW)).isEmpty();
        assertThat(cache.getFresh(key(null), WINDOW)).isEmpty();
    }

    // ------------------------------------------------------------------ helpers

    private static LastGoodExampleCache.Key key() {
        return key(null);
    }

    private static LastGoodExampleCache.Key key(String insuranceTextOverride) {
        return new LastGoodExampleCache.Key(CreditVariant.PRET_PERSO, "PBPERSO", 15000L, 48L,
                "CRBP", "NEOURL41", insuranceTextOverride);
    }

}
