package ch.sofinco.core.render;

import ch.sofinco.core.model.representativeexample.CampaignParams;
import ch.sofinco.core.model.representativeexample.SimulationParams;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.jahia.services.render.filter.cache.CacheKeyPartGenerator;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.http.HttpServletRequest;
import java.util.Properties;

/**
 * Ajoute l'empreinte de simulation de la page à la clé de cache des fragments.
 *
 * <p>Jahia indexe un fragment par le NŒUD rendu, pas par la page qui le rend : un richtext
 * mutualisé n'a qu'une entrée pour tout le site. Comme son texte porte désormais des jetons
 * substitués à partir des paramètres de PAGE, sans ce segment le fragment rendu à 3 000 € / 36 mois
 * serait resservi tel quel sur une page à 12 000 € / 84 mois.
 *
 * <p>Préféré à {@code cache.mainResource="true"}, qui force une entrée par page et détruit la
 * mutualisation : ici deux pages aux mêmes paramètres partagent encore leurs fragments.
 *
 * <p><b>Coût assumé.</b> Le segment entre dans la clé de TOUS les fragments, y compris ceux qui
 * ne portent aucun jeton — en-tête, pied de page, navigation. Le mécanisme n'a aucun moyen de
 * savoir à l'avance quel richtext en contient : c'est le prix d'une substitution ouverte à
 * n'importe quel texte de la page. Une chrome partagée est donc stockée une fois par empreinte
 * distincte, plus une fois pour {@code none} (les pages sans simulation).
 *
 * <p>C'est une version atténuée du coût que {@code cache.mainResource} imposerait, et non son
 * absence : la multiplication suit le nombre de CONFIGURATIONS de simulation du site, pas son
 * nombre de pages. Quelques configurations la rendent négligeable ; si elle devait croître —
 * montants pilotés par page, barèmes par offre — c'est la surveillance de la taille de
 * {@code HTMLCache} qui le signalerait en premier.
 *
 * <p>{@code getValue} étant appelé pour chaque fragment, la valeur est mémorisée en attribut de
 * requête — une seule remontée JCR par requête.
 *
 * <p><b>Enregistrement.</b> {@code @Component(service = CacheKeyPartGenerator.class)} est le chemin
 * officiel : Jahia 8.2 déclare le whiteboard correspondant dans le bundle
 * {@code org.jahia.bundles.extends.osgi.registry}, aux côtés de {@code RenderFilter} —
 * <pre>
 *   &lt;reference name="registerCacheKeyPartGenerator" cardinality="0..n" policy="dynamic"
 *              interface="org.jahia.services.render.filter.cache.CacheKeyPartGenerator"
 *              bind="registerCacheKeyPartGenerator" .../&gt;
 * </pre>
 * qui relaie vers {@code DefaultCacheKeyGenerator.registerPartGenerator}. Aucun bean Spring, aucun
 * ServiceTracker à écrire. Si le segment venait à manquer des clés, vérifier d'abord que le
 * composant {@code OSGIRegistry} est lui-même actif.
 *
 * <p>Contrôle de non-régression : le même richtext {@code {{taea}}} sur deux pages aux paramètres
 * différents doit afficher deux résultats différents en live.
 */
@Component(service = CacheKeyPartGenerator.class)
public class SimulationCacheKeyPartGenerator implements CacheKeyPartGenerator {

    private static final Logger LOG = LoggerFactory.getLogger(SimulationCacheKeyPartGenerator.class);

    /** Segment de clé. Le changer invalide l'intégralité du cache de fragments du site. */
    private static final String KEY = "sofincoSim";

    /** Mémorisation par requête : {@code getValue} est appelé une fois par fragment. */
    private static final String REQUEST_CACHE = "sofinco.simulation.keyPart";

    @Override
    public String getKey() {
        return KEY;
    }

    @Override
    public String getValue(Resource resource, RenderContext renderContext, Properties properties) {
        try {
            return computeValue(renderContext);
        } catch (RuntimeException e) {
            // Empreinte distincte de `none` et de toute empreinte réelle : renvoyer `none`
            // partagerait l'entrée d'une page sans simulation, soit la fuite même qu'on empêche.
            // Une entrée isolée coûte de la mémoire ; une entrée partagée à tort, un chiffre faux.
            LOG.warn("Empreinte de simulation indisponible, clé isolée par défaut : {}", e.getMessage());
            return "unknown";
        }
    }

    private String computeValue(RenderContext renderContext) {
        if (renderContext == null) {
            return SimulationParams.NO_SIMULATION;
        }

        HttpServletRequest request = renderContext.getRequest();
        if (request != null) {
            Object cached = request.getAttribute(REQUEST_CACHE);
            if (cached instanceof String value) {
                return value;
            }
        }

        String value = SimulationParams.NO_SIMULATION;
        var main = renderContext.getMainResource();
        if (main != null) {
            JCRNodeWrapper page = SimulationParams.findPage(main.getNode());
            value = signatureOf(page);
        }

        if (request != null) {
            request.setAttribute(REQUEST_CACHE, value);
        }
        return value;
    }

    /**
     * Empreinte combinée des DEUX familles de variables.
     *
     * <p>Quand la simulation est active, sa signature porte déjà la provenance : les variables de
     * campagne d'une même page en découlent, rien à ajouter. La clé des pages existantes est donc
     * inchangée, et le cache de fragments n'est pas invalidé par cette évolution.
     *
     * <p><b>Le cas qui manquait.</b> Une page portant une provenance mais PAS de type de crédit
     * produisait {@code none}, comme toute page sans simulation. Deux pages aux provenances
     * différentes partageaient alors la même clé — et se seraient servi mutuellement leurs
     * fragments dès que les variables de campagne y afficheraient des montants. On suffixe donc
     * l'empreinte avec la provenance dans ce cas précis.
     *
     * <p>{@code none} ne contient pas de tiret et la provenance est normalisée par le même
     * {@code sanitize}, qui l'exclut : {@code none-NEOURL41} est sans ambiguïté.
     */
    private static String signatureOf(JCRNodeWrapper page) {
        var params = SimulationParams.read(page);
        if (params != null) {
            return params.signature();
        }
        var campaign = CampaignParams.read(page);
        if (campaign != null) {
            return SimulationParams.NO_SIMULATION + "-" + campaign.signature();
        }
        return SimulationParams.NO_SIMULATION;
    }

    /**
     * Aucun remplacement différé : ce mécanisme sert aux segments dépendant du visiteur (ACL,
     * préférences). L'empreinte de simulation dépend de la PAGE, elle est déjà résolue ici.
     */
    @Override
    public String replacePlaceholders(RenderContext renderContext, String keyPart) {
        return keyPart;
    }
}
