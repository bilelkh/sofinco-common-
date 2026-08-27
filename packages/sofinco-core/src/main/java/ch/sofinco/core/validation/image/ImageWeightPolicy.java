package ch.sofinco.core.validation.image;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import javax.jcr.NodeIterator;
import javax.jcr.RepositoryException;
import javax.jcr.Value;

import org.jahia.services.content.JCRNodeWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Politique de poids d'images : modèle de règles (défauts intégrés) + <b>overlay</b> de la
 * configuration éditoriale ({@code sofnt:imageWeightPolicy}, rangée dans
 * {@code contents/site-settings}). Une instance représente la liste ORDONNÉE des règles
 * effectives pour un contenu donné (l'ordre = ordre d'évaluation).
 *
 * <p>Overlay : une catégorie absente de la config garde son défaut. Par règle,
 * {@code inheritDefaults=true} (défaut) fait l'<b>union</b> des tokens de la config avec les
 * tokens par défaut de la catégorie (config vide ⇒ défauts ; ajout d'un token ⇒ additif) ;
 * {@code false} remplace intégralement. Le {@code maxSizeKb} de la règle fait toujours foi.
 * Config absente/illisible ⇒ repli total sur les défauts.</p>
 *
 * <p>Séparée de {@link MaxImageWeightValidator} : ce dernier ne fait que parcourir le contenu
 * et émettre les violations ; toute la logique « quelle limite pour quel champ » vit ici.</p>
 */
final class ImageWeightPolicy {

    private static final Logger LOGGER = LoggerFactory.getLogger(ImageWeightPolicy.class);

    private static final String POLICY_TYPE = "sofnt:imageWeightPolicy";
    private static final String RULE_TYPE = "sofnt:imageWeightRule";
    private static final String SITE_SETTINGS = "contents/site-settings";
    private static final String CATEGORY_DEFAULT = "default";
    private static final long HARD_DEFAULT_BYTES = 1024L * 1024L; // 1 Mo, ultime filet

    /**
     * Cache des règles effectives, clé = identifiant de site. {@link #forNode} est appelé à chaque
     * save d'un contenu porteur d'image (publication / import ⇒ nombreux noeuds, plusieurs threads),
     * alors que la policy change très rarement.
     *
     * <p>Le TTL n'est PAS le mécanisme de fraîcheur principal : c'est un <b>filet de sécurité</b>.
     * L'éviction explicite ({@link #invalidate()}, déclenchée à la sauvegarde de la policy) rafraîchit
     * localement dans l'instant ; le TTL borne la fenêtre de péremption pour les cas où l'éviction
     * n'atteint pas une instance (nœuds pairs d'un cluster : les évènements JCR sont locaux). D'où un
     * TTL long (1 h) : au-delà de quelques minutes, il n'économise plus de lectures et ne fait
     * qu'élargir la fenêtre de staleness d'un pair qui aurait manqué l'éviction.</p>
     */
    private static final long CACHE_TTL_MS = 60L * 60L * 1000L; // 1 h : filet de sécurité
    private static final Map<String, CacheEntry> CACHE = new ConcurrentHashMap<>();

    /** Entrée de cache immuable : règles effectives + péremption absolue (ms epoch). */
    private static final class CacheEntry {
        final List<Rule> rules;
        final long expiresAt;

        CacheEntry(List<Rule> rules, long expiresAt) {
            this.rules = rules;
            this.expiresAt = expiresAt;
        }
    }

    /** Défauts intégrés (repli + source d'héritage des tokens). L'ordre = ordre d'évaluation. */
    enum ImageWeightRule {
        ICON_LOGO("icon-logo", "Icônes & logos", 50L,
                "mainIcon", "icon", "verifiedLogo", "picto", "logo",
                "mainLogo", "logoImage", "avatarUrl", "imageBeforeAnim", "qrImageRef"),
        MOBILE("mobile", "Image mobile", 100L, "imageMobile", "imgMobile", "mobileImage"),
        TABLET("tablet", "Image tablette", 500L, "imageTablet"),
        DEFAULT(CATEGORY_DEFAULT, "Bureau / illustration", 1024L);

        final String key;
        final String label;
        final long maxBytes;
        final String[] tokens;

        ImageWeightRule(String key, String label, long maxKb, String... tokens) {
            this.key = key;
            this.label = label;
            this.maxBytes = maxKb * 1024L;
            this.tokens = tokens;
        }

        /** Tokens normalisés en minuscules (le matching se fait en lower-case). */
        List<String> lowerTokens() {
            final List<String> out = new ArrayList<>(tokens.length);
            for (String t : tokens) {
                out.add(t.toLowerCase(Locale.ROOT));
            }
            return out;
        }

        static ImageWeightRule byKey(String key) {
            for (ImageWeightRule r : values()) {
                if (r.key.equals(key)) {
                    return r;
                }
            }
            return null;
        }

        static String labelFor(String key) {
            final ImageWeightRule r = byKey(key);
            return (r != null) ? r.label : key;
        }
    }

    /** Règle effective (issue de l'overlay config/défauts). Tokens toujours en minuscules. */
    static final class Rule {
        final String label;
        final String category;
        final List<String> tokens;
        final long maxBytes;

        Rule(String label, String category, List<String> tokens, long maxBytes) {
            this.label = label;
            this.category = category;
            this.tokens = tokens;
            this.maxBytes = maxBytes;
        }

        boolean matches(String lowerPropertyName) {
            for (String token : tokens) {
                if (lowerPropertyName.contains(token)) {
                    return true;
                }
            }
            return false;
        }
    }

    private static final List<Rule> DEFAULT_RULES = buildDefaultRules();

    private final List<Rule> rules;

    private ImageWeightPolicy(List<Rule> rules) {
        this.rules = rules;
    }

    /**
     * Politique effective pour un contenu : overlay de la config sur les défauts, avec repli
     * total sur les défauts si aucune policy exploitable. Ne retourne jamais {@code null}.
     */
    static ImageWeightPolicy forNode(JCRNodeWrapper node) {
        final JCRNodeWrapper site = resolveSite(node);
        if (site == null) {
            return new ImageWeightPolicy(DEFAULT_RULES); // hors site -> défauts (config introuvable)
        }
        return new ImageWeightPolicy(rulesForSite(site));
    }

    private static JCRNodeWrapper resolveSite(JCRNodeWrapper node) {
        try {
            return node.getResolveSite();
        } catch (RepositoryException e) {
            return null;
        }
    }

    /**
     * Règles effectives pour un site, servies par le cache court si l'entrée est fraîche ;
     * sinon overlay recalculé (repli sur les défauts si config absente/illisible) puis mémorisé.
     */
    private static List<Rule> rulesForSite(JCRNodeWrapper site) {
        final String siteKey = identifier(site);
        final long now = System.currentTimeMillis();
        if (siteKey != null) {
            final CacheEntry cached = CACHE.get(siteKey);
            if (cached != null && now < cached.expiresAt) {
                return cached.rules;
            }
        }
        final List<Rule> configured = loadConfiguredRules(site);
        final List<Rule> rules = configured.isEmpty() ? DEFAULT_RULES : configured;
        if (siteKey != null) {
            CACHE.put(siteKey, new CacheEntry(rules, now + CACHE_TTL_MS));
        }
        return rules;
    }

    private static String identifier(JCRNodeWrapper site) {
        try {
            return site.getIdentifier();
        } catch (RepositoryException e) {
            return null; // sans clé stable -> pas de cache, lecture directe
        }
    }

    /** Vrai si le noeud est un noeud de configuration de policy (la policy elle-même ou une règle). */
    static boolean isPolicyNode(JCRNodeWrapper node) throws RepositoryException {
        return node.isNodeType(POLICY_TYPE) || node.isNodeType(RULE_TYPE);
    }

    /** Éviction globale du cache. À déclencher quand une policy est sauvegardée (fraîcheur immédiate). */
    static void invalidate() {
        CACHE.clear();
    }

    /** Éviction ciblée du site portant {@code node} (si résoluble), sinon no-op. */
    static void invalidate(JCRNodeWrapper node) {
        final JCRNodeWrapper site = resolveSite(node);
        if (site == null) {
            return;
        }
        final String key = identifier(site);
        if (key != null) {
            CACHE.remove(key);
        }
    }

    /** Première règle non-défaut qui matche (ordre respecté) ; sinon la règle 'default' ; sinon 1 Mo. */
    Rule pick(String propertyName) {
        final String name = propertyName.toLowerCase(Locale.ROOT);
        Rule fallback = null;
        for (Rule rule : rules) {
            if (CATEGORY_DEFAULT.equals(rule.category)) {
                fallback = rule; // le 'default' est le filet, jamais un token-match
                continue;
            }
            if (rule.matches(name)) {
                return rule;
            }
        }
        return (fallback != null) ? fallback
                : new Rule("Bureau / illustration", CATEGORY_DEFAULT, new ArrayList<>(), HARD_DEFAULT_BYTES);
    }

    // ── Chargement / overlay de la configuration ────────────────────────────────

    /** Overlay des règles configurées sur les défauts ; liste vide si aucune policy exploitable. */
    private static List<Rule> loadConfiguredRules(JCRNodeWrapper site) {
        try {
            final JCRNodeWrapper policy = findPolicyNode(site);
            if (policy == null) {
                return List.of();
            }

            final List<Rule> effective = new ArrayList<>();
            final Set<String> seen = new HashSet<>();

            final NodeIterator it = policy.getNodes();
            while (it.hasNext()) {
                final JCRNodeWrapper rn = (JCRNodeWrapper) it.nextNode();
                if (rn.isNodeType(RULE_TYPE)) {
                    final var rule = readRule(rn);
                    effective.add(rule);
                    seen.add(rule.category);
                }
            }

            appendMissingDefaults(effective, seen);
            return effective;
        } catch (RepositoryException e) {
            LOGGER.warn("Policy de poids d'images illisible, repli sur les defauts : {}", e.getMessage());
            return List.of();
        }
    }

    /** Premier {@code sofnt:imageWeightPolicy} sous site-settings, ou {@code null}. */
    private static JCRNodeWrapper findPolicyNode(JCRNodeWrapper site) throws RepositoryException {
        if (!site.hasNode(SITE_SETTINGS)) {
            return null;
        }
        return firstChildOfType(site.getNode(SITE_SETTINGS), POLICY_TYPE);
    }

    /** Construit une règle effective à partir d'un noeud {@code sofnt:imageWeightRule}. */
    private static Rule readRule(JCRNodeWrapper rn) throws RepositoryException {
        final String category = rn.hasProperty("category")
                ? rn.getProperty("category").getString() : CATEGORY_DEFAULT;
        final boolean inherit = !rn.hasProperty("inheritDefaults")
                || rn.getProperty("inheritDefaults").getBoolean();
        final long maxKb = rn.hasProperty("maxSizeKb") ? rn.getProperty("maxSizeKb").getLong() : 1024L;

        final List<String> tokens = mergeTokens(category, inherit, readConfigTokens(rn));
        return new Rule(ImageWeightRule.labelFor(category), category, tokens, maxKb * 1024L);
    }

    /** Tokens saisis dans la config (trimés, en minuscules, vides ignorés). */
    private static List<String> readConfigTokens(JCRNodeWrapper rn) throws RepositoryException {
        final List<String> configTokens = new ArrayList<>();
        if (!rn.hasProperty("matchTokens")) {
            return configTokens;
        }
        for (Value v : rn.getProperty("matchTokens").getValues()) {
            final var t = v.getString();
            if (t != null && !t.trim().isEmpty()) {
                configTokens.add(t.trim().toLowerCase(Locale.ROOT));
            }
        }
        return configTokens;
    }

    /** Union (héritage) ou remplacement total des tokens, selon {@code inherit}. */
    private static List<String> mergeTokens(String category, boolean inherit, List<String> configTokens) {
        final var def = ImageWeightRule.byKey(category);
        if (!inherit || def == null) {
            return configTokens; // override total
        }
        final List<String> tokens = def.lowerTokens(); // union : défauts + config
        for (String t : configTokens) {
            if (!tokens.contains(t)) {
                tokens.add(t);
            }
        }
        return tokens;
    }

    /** Ajoute les catégories par défaut absentes de la config, telles quelles. */
    private static void appendMissingDefaults(List<Rule> effective, Set<String> seen) {
        for (ImageWeightRule d : ImageWeightRule.values()) {
            if (!seen.contains(d.key)) {
                effective.add(new Rule(d.label, d.key, d.lowerTokens(), d.maxBytes));
            }
        }
    }

    private static JCRNodeWrapper firstChildOfType(JCRNodeWrapper parent, String type) throws RepositoryException {
        final NodeIterator it = parent.getNodes();
        while (it.hasNext()) {
            final JCRNodeWrapper child = (JCRNodeWrapper) it.nextNode();
            if (child.isNodeType(type)) {
                return child;
            }
        }
        return null;
    }

    private static List<Rule> buildDefaultRules() {
        final ImageWeightRule[] defaults = ImageWeightRule.values();
        final List<Rule> rules = new ArrayList<>(defaults.length);
        for (ImageWeightRule r : defaults) {
            rules.add(new Rule(r.label, r.key, r.lowerTokens(), r.maxBytes));
        }
        return rules;
    }
}
