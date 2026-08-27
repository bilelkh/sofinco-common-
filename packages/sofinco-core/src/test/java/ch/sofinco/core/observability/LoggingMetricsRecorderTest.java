package ch.sofinco.core.observability;

import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.core.LogEvent;
import org.apache.logging.log4j.core.LoggerContext;
import org.apache.logging.log4j.core.appender.AbstractAppender;
import org.apache.logging.log4j.core.config.Configuration;
import org.apache.logging.log4j.core.config.LoggerConfig;
import org.apache.logging.log4j.core.config.Property;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Capture via un appender log4j2 dédié au journal {@code ch.sofinco.core.metrics}.
 *
 * <p>Le binding SLF4J effectif de ce module est <b>log4j2</b> ({@code log4j-slf4j-impl}), et non
 * {@code slf4j-jdk14} — ce dernier est bien au classpath mais perd l'arbitrage. Un handler
 * {@code java.util.logging} ne capturerait donc rien.
 */
class LoggingMetricsRecorderTest {

    private static final String LOGGER_NAME = "ch.sofinco.core.metrics";

    private final MetricsRecorder recorder = new LoggingMetricsRecorder();

    private LoggerContext context;
    private CapturingAppender appender;

    @BeforeEach
    void attachAppender() {
        context = (LoggerContext) LogManager.getContext(false);
        appender = new CapturingAppender();
        appender.start();
    }

    @AfterEach
    void detachAppender() {
        Configuration config = context.getConfiguration();
        config.removeLogger(LOGGER_NAME);
        context.updateLoggers();
        appender.stop();
    }

    /**
     * Installe un {@link LoggerConfig} dédié — n'affecte pas le reste de la suite.
     *
     * <p>Constructeur plutôt que la fabrique {@code createLogger}, dépréciée et à huit arguments
     * dont six sans intérêt ici. {@code additive = false} : les événements ne remontent pas à la
     * racine, la sortie des tests reste propre.
     */
    private void enableAt(Level level) {
        Configuration config = context.getConfiguration();
        LoggerConfig loggerConfig = new LoggerConfig(LOGGER_NAME, level, false);
        loggerConfig.addAppender(appender, level, null);
        config.addLogger(LOGGER_NAME, loggerConfig);
        context.updateLoggers();
    }

    @Test
    void whenEnabled_theCounterAndItsTagsAreWritten() {
        enableAt(Level.DEBUG);

        recorder.increment("repex.served", "source", "cache", "variant", "PRET_PERSO");

        assertThat(appender.messages())
                .singleElement()
                .satisfies(line -> assertThat(line)
                        .contains("repex.served")
                        .contains("source cache")
                        .contains("variant PRET_PERSO"));
    }

    /** Éteint = l'état normal hors campagne de mesure. Rien ne doit sortir. */
    @Test
    void whenDisabled_nothingIsWritten() {
        enableAt(Level.INFO);

        recorder.increment("repex.served", "source", "apim");

        assertThat(appender.messages()).isEmpty();
    }

    @Test
    void blankName_isIgnored() {
        enableAt(Level.DEBUG);

        recorder.increment(null, "source", "apim");
        recorder.increment("  ", "source", "apim");

        assertThat(appender.messages()).isEmpty();
    }

    /**
     * Une valeur absente s'écrit vide, jamais « null ».
     *
     * <p>{@code String.join} ne lève pas sur un élément nul : il écrit le mot. La ligne se lirait
     * alors comme un tag dont la valeur EST « null » — indistinguable d'une vraie valeur portant
     * ce nom, sur le journal même qui sert à mesurer le taux de cache.
     */
    @Test
    void nullTagValue_isWrittenEmpty_notAsTheWordNull() {
        enableAt(Level.DEBUG);

        recorder.increment("repex.served", "source", null, "variant", "PRET_PERSO");

        assertThat(appender.messages())
                .singleElement()
                .satisfies(line -> assertThat(line)
                        .contains("variant PRET_PERSO")
                        .doesNotContain("null"));
    }

    /** Le contrat du SPI interdit de lever : l'observabilité ne casse jamais le rendu. */
    @Test
    void adversarialInputs_neverThrow() {
        enableAt(Level.DEBUG);

        assertThatCode(() -> {
            recorder.increment("repex.served", (String[]) null);
            recorder.increment("repex.served");                  // aucun tag
            recorder.increment("repex.served", "source");         // longueur impaire
            recorder.increment("repex.served", "source", null);   // valeur nulle
        }).doesNotThrowAnyException();
    }

    // ------------------------------------------------------------------ helper

    private static final class CapturingAppender extends AbstractAppender {

        private final List<String> captured = new ArrayList<>();

        CapturingAppender() {
            super("capturing", null, null, true, Property.EMPTY_ARRAY);
        }

        List<String> messages() {
            return captured;
        }

        @Override
        public void append(LogEvent event) {
            captured.add(event.getMessage().getFormattedMessage());
        }
    }
}
