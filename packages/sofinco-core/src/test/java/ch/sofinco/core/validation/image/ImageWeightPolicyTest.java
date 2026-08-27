package ch.sofinco.core.validation.image;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Iterator;

import javax.jcr.RepositoryException;

import org.jahia.services.content.JCRNodeIteratorWrapper;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapper;
import org.jahia.services.content.JCRValueWrapper;
import org.jahia.services.content.decorator.JCRSiteNode;
import org.junit.jupiter.api.Test;

/**
 * Tests unitaires de {@link ImageWeightPolicy} — le modèle de règles et l'overlay de la
 * configuration éditoriale ({@code sofnt:imageWeightPolicy}), isolés du parcours de contenu.
 *
 * <p>Complète {@code MaxImageWeightValidatorTest} (qui teste le câblage de bout en bout) en
 * exerçant directement {@link ImageWeightPolicy#forNode} et {@link ImageWeightPolicy#pick},
 * y compris les branches d'overlay fines : union (héritage) vs remplacement total des tokens.</p>
 */
class ImageWeightPolicyTest {

    private static final long KB = 1024L;

    // ── Défauts (aucune config) ─────────────────────────────────────────────────

    @Test
    void forNode_withoutSite_usesBuiltInDefaults() throws Exception {
        JCRNodeWrapper node = mock(JCRNodeWrapper.class);
        when(node.getResolveSite()).thenReturn(null);

        ImageWeightPolicy policy = ImageWeightPolicy.forNode(node);

        assertThat(policy.pick("mainLogo").maxBytes).isEqualTo(50 * KB);
        assertThat(policy.pick("imageMobile").maxBytes).isEqualTo(100 * KB);
        assertThat(policy.pick("imageTablet").maxBytes).isEqualTo(500 * KB);
        assertThat(policy.pick("banner").maxBytes).isEqualTo(1024 * KB);
    }

    @Test
    void pick_isCaseInsensitiveAndFallsBackToDefaultCategory() throws Exception {
        ImageWeightPolicy policy = ImageWeightPolicy.forNode(nodeWithoutPolicy());

        assertThat(policy.pick("HeaderICON").category).isEqualTo("icon-logo");
        assertThat(policy.pick("somethingUnmatched").category).isEqualTo("default");
        assertThat(policy.pick("somethingUnmatched").label).isEqualTo("Bureau / illustration");
    }

    @Test
    void forNode_withEmptyPolicyNode_yieldsDefaults() throws Exception {
        JCRNodeWrapper node = nodeWithPolicy(); // policy présente mais sans règle enfant

        ImageWeightPolicy policy = ImageWeightPolicy.forNode(node);

        assertThat(policy.pick("mainLogo").maxBytes).isEqualTo(50 * KB);
        assertThat(policy.pick("banner").maxBytes).isEqualTo(1024 * KB);
    }

    // ── Overlay : maxSizeKb ─────────────────────────────────────────────────────

    @Test
    void forNode_configuredMaxSize_overridesDefaultThreshold() throws Exception {
        JCRNodeWrapper rule = ruleNode("icon-logo", 200L, true /* inherit */);
        JCRNodeWrapper node = nodeWithPolicy(rule);

        ImageWeightPolicy policy = ImageWeightPolicy.forNode(node);

        assertThat(policy.pick("mainLogo").maxBytes).isEqualTo(200 * KB);
        // Catégorie non configurée : garde son défaut.
        assertThat(policy.pick("imageMobile").maxBytes).isEqualTo(100 * KB);
    }

    // ── Overlay : tokens (union vs remplacement) ────────────────────────────────

    @Test
    void forNode_inheritTrue_unionsConfigTokensWithDefaults() throws Exception {
        // icon-logo, inheritDefaults=true, token additionnel "brandmark".
        JCRNodeWrapper rule = ruleNode("icon-logo", 60L, true, "brandmark");
        JCRNodeWrapper node = nodeWithPolicy(rule);

        ImageWeightPolicy policy = ImageWeightPolicy.forNode(node);

        // Le token par défaut ("logo") ET le token config ("brandmark") mappent la catégorie.
        assertThat(policy.pick("mainLogo").category).isEqualTo("icon-logo");
        assertThat(policy.pick("headerBrandmark").category).isEqualTo("icon-logo");
        assertThat(policy.pick("headerBrandmark").maxBytes).isEqualTo(60 * KB);
    }

    @Test
    void forNode_inheritFalse_replacesDefaultTokensEntirely() throws Exception {
        // icon-logo, inheritDefaults=false, seul "brandmark" reste.
        JCRNodeWrapper rule = ruleNode("icon-logo", 60L, false, "brandmark");
        JCRNodeWrapper node = nodeWithPolicy(rule);

        ImageWeightPolicy policy = ImageWeightPolicy.forNode(node);

        // "brandmark" mappe la catégorie...
        assertThat(policy.pick("headerBrandmark").category).isEqualTo("icon-logo");
        // ...mais le token par défaut "logo" ne mappe plus icon-logo (remplacement total) -> default.
        assertThat(policy.pick("mainLogo").category).isEqualTo("default");
    }

    // ── Cache court par site ────────────────────────────────────────────────────

    @Test
    void forNode_cachesEffectiveRulesPerSite() throws Exception {
        JCRSiteNode site = siteWithPolicy("site:cache-hit", ruleNode("icon-logo", 200L, true));
        JCRNodeWrapper node = nodeForSite(site);

        ImageWeightPolicy first = ImageWeightPolicy.forNode(node);
        ImageWeightPolicy second = ImageWeightPolicy.forNode(node);

        assertThat(first.pick("mainLogo").maxBytes).isEqualTo(200 * KB);
        assertThat(second.pick("mainLogo").maxBytes).isEqualTo(200 * KB);
        // Le 2e appel (dans le TTL) est servi par le cache : la config n'est lue qu'une fois.
        verify(site, times(1)).getNode("contents/site-settings");
    }

    @Test
    void invalidate_forcesReloadOnNextCall() throws Exception {
        JCRSiteNode site = siteWithPolicy("site:evict", ruleNode("icon-logo", 200L, true));
        JCRNodeWrapper node = nodeForSite(site);

        ImageWeightPolicy.forNode(node);   // miss -> lit + met en cache
        ImageWeightPolicy.invalidate();    // éviction globale
        ImageWeightPolicy.forNode(node);   // re-miss -> relit

        // Deux lectures JCR (l'éviction a bien vidé le cache entre les deux appels).
        verify(site, times(2)).getNode("contents/site-settings");
    }

    @Test
    void forNode_keepsCachePerSiteIndependent() throws Exception {
        JCRSiteNode siteA = siteWithPolicy("site:A", ruleNode("icon-logo", 200L, true));
        JCRSiteNode siteB = siteWithPolicy("site:B", ruleNode("icon-logo", 90L, true));

        ImageWeightPolicy a = ImageWeightPolicy.forNode(nodeForSite(siteA));
        ImageWeightPolicy b = ImageWeightPolicy.forNode(nodeForSite(siteB));

        // Chaque site garde sa propre policy : pas de contamination via le cache statique.
        assertThat(a.pick("mainLogo").maxBytes).isEqualTo(200 * KB);
        assertThat(b.pick("mainLogo").maxBytes).isEqualTo(90 * KB);
    }

    @Test
    void isPolicyNode_detectsPolicyAndRuleTypes() throws Exception {
        JCRNodeWrapper policy = mock(JCRNodeWrapper.class);
        when(policy.isNodeType("sofnt:imageWeightPolicy")).thenReturn(true);

        JCRNodeWrapper rule = mock(JCRNodeWrapper.class);
        when(rule.isNodeType("sofnt:imageWeightRule")).thenReturn(true);

        JCRNodeWrapper other = mock(JCRNodeWrapper.class); // ni policy ni règle

        assertThat(ImageWeightPolicy.isPolicyNode(policy)).isTrue();
        assertThat(ImageWeightPolicy.isPolicyNode(rule)).isTrue();
        assertThat(ImageWeightPolicy.isPolicyNode(other)).isFalse();
    }

    // ── Robustesse ──────────────────────────────────────────────────────────────

    @Test
    void forNode_whenSiteReadThrows_fallsBackToDefaults() throws Exception {
        JCRNodeWrapper node = mock(JCRNodeWrapper.class);
        when(node.getResolveSite()).thenThrow(new RepositoryException("site unreachable"));

        ImageWeightPolicy policy = ImageWeightPolicy.forNode(node);

        assertThat(policy.pick("mainLogo").maxBytes).isEqualTo(50 * KB);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private static JCRNodeWrapper nodeWithoutPolicy() throws Exception {
        JCRNodeWrapper node = mock(JCRNodeWrapper.class);
        when(node.getResolveSite()).thenReturn(null);
        return node;
    }

    /**
     * Noeud dont le site expose une policy (éventuellement vide). Identifiant de site {@code null} :
     * le cache est court-circuité (lecture directe), ce qui isole les tests d'overlay du cache.
     */
    private static JCRNodeWrapper nodeWithPolicy(JCRNodeWrapper... rules) throws Exception {
        return nodeForSite(siteWithPolicy(null, rules));
    }

    /** Site exposant une policy contenant les règles données ; identifiant utilisé comme clé de cache. */
    private static JCRSiteNode siteWithPolicy(String identifier, JCRNodeWrapper... rules) throws Exception {
        JCRNodeIteratorWrapper policyChildren = nodeIterator(rules);
        JCRNodeWrapper policy = mock(JCRNodeWrapper.class);
        when(policy.isNodeType("sofnt:imageWeightPolicy")).thenReturn(true);
        when(policy.getNodes()).thenReturn(policyChildren);

        JCRNodeIteratorWrapper settingsChildren = nodeIterator(policy);
        JCRNodeWrapper siteSettings = mock(JCRNodeWrapper.class);
        when(siteSettings.getNodes()).thenReturn(settingsChildren);

        JCRSiteNode site = mock(JCRSiteNode.class);
        if (identifier != null) {
            when(site.getIdentifier()).thenReturn(identifier);
        }
        when(site.hasNode("contents/site-settings")).thenReturn(true);
        when(site.getNode("contents/site-settings")).thenReturn(siteSettings);
        return site;
    }

    private static JCRNodeWrapper nodeForSite(JCRSiteNode site) throws Exception {
        JCRNodeWrapper node = mock(JCRNodeWrapper.class);
        when(node.getResolveSite()).thenReturn(site);
        return node;
    }

    private static JCRNodeWrapper ruleNode(String category, long maxSizeKb, boolean inherit,
            String... matchTokens) throws Exception {
        JCRPropertyWrapper categoryProp = stringProperty(category);
        JCRPropertyWrapper inheritProp = booleanProperty(inherit);
        JCRPropertyWrapper maxSizeProp = longProperty(maxSizeKb);

        JCRNodeWrapper rule = mock(JCRNodeWrapper.class);
        when(rule.isNodeType("sofnt:imageWeightRule")).thenReturn(true);
        when(rule.hasProperty("category")).thenReturn(true);
        when(rule.getProperty("category")).thenReturn(categoryProp);
        when(rule.hasProperty("inheritDefaults")).thenReturn(true);
        when(rule.getProperty("inheritDefaults")).thenReturn(inheritProp);
        when(rule.hasProperty("maxSizeKb")).thenReturn(true);
        when(rule.getProperty("maxSizeKb")).thenReturn(maxSizeProp);

        if (matchTokens.length == 0) {
            when(rule.hasProperty("matchTokens")).thenReturn(false);
        } else {
            JCRPropertyWrapper tokensProp = multiStringProperty(matchTokens);
            when(rule.hasProperty("matchTokens")).thenReturn(true);
            when(rule.getProperty("matchTokens")).thenReturn(tokensProp);
        }
        return rule;
    }

    private static JCRPropertyWrapper stringProperty(String value) throws Exception {
        JCRPropertyWrapper prop = mock(JCRPropertyWrapper.class);
        when(prop.getString()).thenReturn(value);
        return prop;
    }

    private static JCRPropertyWrapper booleanProperty(boolean value) throws Exception {
        JCRPropertyWrapper prop = mock(JCRPropertyWrapper.class);
        when(prop.getBoolean()).thenReturn(value);
        return prop;
    }

    private static JCRPropertyWrapper longProperty(long value) throws Exception {
        JCRPropertyWrapper prop = mock(JCRPropertyWrapper.class);
        when(prop.getLong()).thenReturn(value);
        return prop;
    }

    private static JCRPropertyWrapper multiStringProperty(String... values) throws Exception {
        JCRValueWrapper[] wrapped = new JCRValueWrapper[values.length];
        for (int i = 0; i < values.length; i++) {
            JCRValueWrapper v = mock(JCRValueWrapper.class);
            when(v.getString()).thenReturn(values[i]);
            wrapped[i] = v;
        }
        JCRPropertyWrapper prop = mock(JCRPropertyWrapper.class);
        when(prop.getValues()).thenReturn(wrapped);
        return prop;
    }

    private static JCRNodeIteratorWrapper nodeIterator(JCRNodeWrapper... nodes) {
        final Iterator<JCRNodeWrapper> delegate = Arrays.asList(nodes).iterator();
        JCRNodeIteratorWrapper it = mock(JCRNodeIteratorWrapper.class);
        when(it.hasNext()).thenAnswer(inv -> delegate.hasNext());
        when(it.nextNode()).thenAnswer(inv -> delegate.next());
        return it;
    }
}
