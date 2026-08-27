package ch.sofinco.core.model.representativeexample;

import ch.sofinco.core.util.JcrReads;
import org.jahia.services.content.JCRNodeWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.RepositoryException;

/**
 * Paramètres de simulation portés par une PAGE, via le mixin {@code sofmix:simulationParams}.
 *
 * <p>Un exemple représentatif décrit une offre sur une page, pas un bloc : porter les paramètres
 * sur le nœud page rend structurelle la règle « un seul exemple par page » et les rend
 * consommables par tous les composants — CTA simulateur, jetons {@code {{taea}}} des mentions.
 *
 * <p><b>{@code simProduct} vide = simulation inactive.</b> Le type de crédit détermine des chiffres
 * réglementés ; aucun défaut au CND, un défaut serait faux la plupart du temps et invisible.
 *
 * <p>Record immuable partagé par {@code SimulationPrepareFilter} et
 * {@code SimulationCacheKeyPartGenerator} : les deux voient nécessairement la même chose.
 */
public record SimulationParams(
        String product,
        Long amount,
        Long duration,
        String scaleCode,
        String sourceId) {

    private static final Logger LOG = LoggerFactory.getLogger(SimulationParams.class);

    /** Mixin de page portant les paramètres. Aligné sur {@code settings/definitions.cnd}. */
    public static final String MIXIN = "sofmix:simulationParams";

    public static final String PROP_PRODUCT = "simProduct";
    public static final String PROP_AMOUNT = "simAmount";
    public static final String PROP_DURATION = "simDuration";
    public static final String PROP_SCALE_CODE = "simScaleCode";
    public static final String PROP_SOURCE_ID = "simSourceId";

    private static final String PAGE_NODE_TYPE = "jnt:page";

    /**
     * Lit les paramètres d'une page.
     *
     * @param page le nœud page, ou {@code null}
     * @return les paramètres, ou {@code null} si la page ne porte pas le mixin ou si le type de
     *         crédit n'est pas renseigné — dans les deux cas la simulation est inactive
     */
    public static SimulationParams read(JCRNodeWrapper page) {
        if (page == null) {
            return null;
        }
        try {
            if (!page.isNodeType(MIXIN)) {
                return null;
            }
        } catch (RepositoryException e) {
            LOG.debug("isNodeType({}) a échoué : {}", MIXIN, e.getMessage());
            return null;
        }

        var product = JcrReads.readString(page, PROP_PRODUCT);
        if (product == null) {
            // Option activée, produit vide : page en cours de contribution. L'audit le signale.
            return null;
        }

        /*
         * MONTANT ET DUREE LUS EN NULLABLE, ET C'EST LE POINT.
         *
         * Substituer un defaut ici court-circuitait la cascade de
         * `RepresentativeExampleServiceImpl#resolveAmount` — page →
         * `sofnt:representativeExampleConfig` → repli code. L'etage intermediaire, le seul que
         * le metier puisse regler sans livraison, n'etait jamais atteint : la propriete etant
         * `autocreated` cote CND, elle etait TOUJOURS presente, et ce `readLongOr` la
         * remplacait de toute facon quand elle ne l'etait pas.
         *
         * `null` signifie desormais « pas de choix sur cette page », et laisse la cascade
         * descendre. Aucun defaut ne peut vivre ici : les bornes dependent de la campagne, et
         * les planchers divergent entre les trois produits.
         */
        return new SimulationParams(
                product,
                JcrReads.readLong(page, PROP_AMOUNT),
                JcrReads.readLong(page, PROP_DURATION),
                JcrReads.readString(page, PROP_SCALE_CODE),
                JcrReads.readString(page, PROP_SOURCE_ID));
    }

    /**
     * Remonte au {@code jnt:page} englobant un nœud, lui-même inclus.
     *
     * @return la page, ou {@code null} si aucune n'est trouvée (contenu hors page, session close)
     */
    public static JCRNodeWrapper findPage(JCRNodeWrapper node) {
        JCRNodeWrapper current = node;
        try {
            while (current != null) {
                if (current.isNodeType(PAGE_NODE_TYPE)) {
                    return current;
                }
                if ("/".equals(current.getPath())) {
                    return null;
                }
                current = current.getParent();
            }
        } catch (RepositoryException e) {
            LOG.debug("Remontée vers la page interrompue : {}", e.getMessage());
        }
        return null;
    }

    /**
     * Empreinte stable destinée à la clé de cache de fragment — voir
     * {@code SimulationCacheKeyPartGenerator}.
     *
     * <p>Caractères restreints à {@code [A-Za-z0-9_]} : la clé Jahia est découpée sur des
     * séparateurs, un caractère inattendu la corromprait.
     *
     * <p><b>Le tiret est exclu parce qu'il est le séparateur.</b> Le conserver rendait l'empreinte
     * ambiguë — {@code scaleCode="A-B", sourceId="C"} et {@code scaleCode="A", sourceId="B-C"}
     * produisaient tous deux {@code PB-15000-48-A-B-C}. Deux configurations distinctes auraient
     * partagé une entrée de cache, soit exactement la fuite que ce mécanisme existe pour empêcher.
     */
    public String signature() {
        return sanitize(product)
                + "-" + amount
                + "-" + duration
                + "-" + sanitize(scaleCode)
                + "-" + sanitize(sourceId);
    }

    /** Empreinte d'une page SANS simulation. Doit être distincte de toute empreinte réelle. */
    public static final String NO_SIMULATION = "none";

    /**
     * Normalisation vers {@code [A-Za-z0-9_]} — <b>volontairement à perte</b>.
     *
     * <p>Deux valeurs distinctes peuvent donc produire le même segment : l'absence et le littéral
     * {@code "_"} donnent {@code "_"}, tout comme {@code "A-B"} et {@code "A.B"} donnent
     * {@code "A_B"}. Une collision ici signifie deux configurations partageant une entrée de cache
     * de fragment, c'est-à-dire des chiffres faux servis sans erreur : ce n'est pas anodin.
     *
     * <p>Le risque est nul sur les valeurs réellement en jeu — codes barème et sourceId sont
     * alphanumériques ({@code CRBP}, {@code NEOURL41}). L'arbitrage est assumé au profit d'une clé
     * LISIBLE dans l'inspecteur de caches ({@code PB-15000-48-_-NEOURL41}), ce qui a servi à
     * diagnostiquer ce mécanisme en recette.
     *
     * <p><b>Si un code barème pouvait un jour contenir autre chose que des alphanumériques</b>, la
     * lisibilité ne suffit plus : ajouter alors un condensé court des valeurs BRUTES en fin de
     * signature, ce qui lève l'ambiguïté sans rien retirer à la lecture.
     *
     * <p><b>Visible dans le paquet</b> : {@link CampaignParams} produit une empreinte qui entre
     * dans la MÊME clé de cache de fragment. Deux normalisations distinctes s'y rencontreraient,
     * avec le risque qu'un caractère accepté d'un côté corrompe la clé de l'autre.
     */
    static String sanitize(String value) {
        if (value == null || value.isEmpty()) {
            return "_";
        }
        return value.replaceAll("\\W", "_");
    }
}
