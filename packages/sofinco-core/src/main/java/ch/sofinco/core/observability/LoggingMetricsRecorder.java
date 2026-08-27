package ch.sofinco.core.observability;

import org.apache.commons.lang3.StringUtils;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Objects;

/**
 * Implémentation de repli du {@link MetricsRecorder} : écrit les compteurs dans le journal.
 *
 * <p>Sans elle, la référence {@code OPTIONAL} du service reste nulle et les compteurs sont
 * calculés puis jetés — {@code repex.served} et son tag {@code source} n'apparaissent nulle part.
 *
 * <p><b>Ce n'est pas une solution de métrologie</b>, c'est un instrument de campagne : des journaux
 * ne sont pas des métriques. Le jour où l'exploitation branche Micrometer, elle déclare une autre
 * implémentation de {@link MetricsRecorder} et aucune ligne de code métier ne change. En attendant,
 * ceci permet de mesurer sans rien déployer d'autre.
 *
 * <p><b>Activation.</b> Journal dédié, éteint par défaut. Depuis
 * {@code /modules/tools/log4jAdmin.jsp} :
 * <pre>
 *   ch.sofinco.core.metrics = DEBUG
 * </pre>
 * puis
 * <pre>
 *   grep "repex.served" jahia.log | grep -oP 'source \K[\w-]+' | sort | uniq -c
 * </pre>
 *
 * <p>Le volume suit le nombre de <b>rendus</b>, pas de visites : le cache de fragments absorbe
 * l'essentiel du trafic. À éteindre une fois la mesure faite.
 */
@Component(service = MetricsRecorder.class)
public class LoggingMetricsRecorder implements MetricsRecorder {

    /** Journal DÉDIÉ : s'active seul, sans entraîner le bruit du reste du paquet. */
    private static final Logger LOG = LoggerFactory.getLogger("ch.sofinco.core.metrics");

    @Override
    public void increment(String name, String... tagKeyValues) {
        // La garde évite le String.join quand le journal est éteint — c'est-à-dire en permanence
        // hors campagne de mesure.
        if (!LOG.isDebugEnabled() || StringUtils.isBlank(name)) {
            return;
        }
        // Le contrat du SPI interdit de lever : ni un tableau nul, ni un élément nul, ne doivent
        // casser le rendu. `String.join` accepte les seconds mais écrit littéralement « null »
        // dans la ligne — une valeur absente se lirait alors comme une valeur nommée « null ».
        LOG.debug("{} {}", name, tagKeyValues == null ? "" : joinTags(tagKeyValues));
    }

    private static String joinTags(String... tagKeyValues) {
        var out = new StringBuilder();
        for (String tag : tagKeyValues) {
            if (!out.isEmpty()) {
                out.append(' ');
            }
            out.append(Objects.toString(tag, ""));
        }
        return out.toString();
    }
}
