package ch.sofinco.core.validation.image;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Iterator;

import javax.jcr.ItemNotFoundException;
import javax.jcr.PropertyIterator;
import javax.jcr.PropertyType;
import javax.jcr.RepositoryException;
import javax.validation.ConstraintValidatorContext;
import javax.validation.ConstraintValidatorContext.ConstraintViolationBuilder;
import javax.validation.ConstraintValidatorContext.ConstraintViolationBuilder.NodeBuilderCustomizableContext;

import org.jahia.services.content.JCRNodeIteratorWrapper;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapper;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.content.JCRValueWrapper;
import org.jahia.services.content.decorator.JCRFileContent;
import org.jahia.services.content.decorator.JCRSiteNode;
import org.jahia.services.content.nodetypes.ExtendedPropertyDefinition;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * Tests unitaires de {@link MaxImageWeightValidator}.
 *
 * <p>Le noeud JCR, ses propriétés et le contexte de validation sont entièrement mockés
 * (Mockito), ce qui permet d'exercer la logique métier (sélection de règle, seuils,
 * overlay de config, robustesse aux erreurs) sans dépôt JCR réel.</p>
 */
class MaxImageWeightValidatorTest {

    private static final long KB = 1024L;

    private final MaxImageWeightValidator validator = new MaxImageWeightValidator();

    // ---------------------------------------------------------------------
    // Cas triviaux / robustesse
    // ---------------------------------------------------------------------

    @Test
    void isValid_returnsTrueWhenHolderIsNull() {
        assertThat(validator.isValid(null, newContext())).isTrue();
    }

    @Test
    void isValid_returnsTrueWhenNodeIsNull() {
        ImageWeightNodeValidator holder = new ImageWeightNodeValidator(null);
        assertThat(validator.isValid(holder, newContext())).isTrue();
    }

    @Test
    void isValid_returnsTrueWhenRepositoryFailsToReadProperties() throws Exception {
        JCRNodeWrapper node = mock(JCRNodeWrapper.class);
        when(node.getProperties()).thenThrow(new RepositoryException("jcr down"));

        // Une panne technique ne doit jamais bloquer la sauvegarde.
        assertThat(validator.isValid(holder(node), newContext())).isTrue();
    }

    @Test
    void isValid_returnsTrueWhenPropertyReadThrowsRuntimeException() throws Exception {
        JCRNodeWrapper node = mock(JCRNodeWrapper.class);
        when(node.getProperties()).thenThrow(new IllegalStateException("session closed"));

        // Une erreur non checkée (bug d'implémentation JCR) ne doit pas non plus bloquer la sauvegarde.
        assertThat(validator.isValid(holder(node), newContext())).isTrue();
    }

    @Test
    void isValid_returnsTrueWhenImageContentIsUnreadable() throws Exception {
        // getFileContent() null au 2e appel (contenu absent/binaire purgé) -> NPE dans checkImages.
        JCRNodeWrapper file = mock(JCRNodeWrapper.class);
        when(file.isNodeType("nt:file")).thenReturn(true);
        JCRFileContent content = mock(JCRFileContent.class);
        when(content.getContentType()).thenReturn("image/png");
        when(file.getFileContent()).thenReturn(content, (JCRFileContent) null);

        JCRNodeWrapper node = nodeWith(property("banner", PropertyType.WEAKREFERENCE, false, file));
        ConstraintValidatorContext ctx = newContext();

        assertThat(validator.isValid(holder(node), ctx)).isTrue();
        verify(ctx, never()).buildConstraintViolationWithTemplate(anyString());
    }

    @Test
    void isValid_returnsTrueWhenNodeHasNoProperties() throws Exception {
        PropertyIterator empty = propertyIterator();
        JCRNodeWrapper node = mock(JCRNodeWrapper.class);
        when(node.getProperties()).thenReturn(empty);

        assertThat(validator.isValid(holder(node), newContext())).isTrue();
    }

    // ---------------------------------------------------------------------
    // Sélection des propriétés : seules les références simples vers image/* comptent
    // ---------------------------------------------------------------------

    @Test
    void isValid_ignoresNonReferenceProperties() throws Exception {
        JCRPropertyWrapper stringProp = property("title", PropertyType.STRING, false);
        JCRNodeWrapper node = nodeWith(stringProp);

        assertThat(validator.isValid(holder(node), newContext())).isTrue();
    }

    @Test
    void isValid_acceptsMultivaluedReferenceWhenAllImagesFit() throws Exception {
        JCRNodeWrapper first = imageFile(200 * KB, "image/png");
        JCRNodeWrapper second = imageFile(300 * KB, "image/jpeg");
        JCRPropertyWrapper gallery = property("gallery", PropertyType.WEAKREFERENCE, true, first, second);
        JCRNodeWrapper node = nodeWith(gallery);

        // 'gallery' -> catégorie 'default' (1 Mo) : les deux images passent.
        assertThat(validator.isValid(holder(node), newContext())).isTrue();
    }

    @Test
    void isValid_rejectsOversizedImageInMultivaluedReference() throws Exception {
        JCRNodeWrapper light = imageFile(30 * KB, "image/png");
        JCRNodeWrapper heavy = imageFile(2 * 1024 * KB, "image/png");
        JCRPropertyWrapper gallery = property("gallery", PropertyType.WEAKREFERENCE, true, light, heavy);
        JCRNodeWrapper node = nodeWith(gallery);

        // La 2e valeur (2 Mo) dépasse la limite 'default' (1 Mo) → rejet.
        assertThat(validator.isValid(holder(node), newContext())).isFalse();
    }

    @Test
    void isValid_reportsEachOffendingImageInMultivaluedReference() throws Exception {
        JCRNodeWrapper heavy1 = imageFile(2 * 1024 * KB, "image/png");
        JCRNodeWrapper heavy2 = imageFile(3 * 1024 * KB, "image/jpeg");
        JCRPropertyWrapper gallery = property("gallery", PropertyType.WEAKREFERENCE, true, heavy1, heavy2);
        JCRNodeWrapper node = nodeWith(gallery);
        TestContext ctx = newTestContext();

        assertThat(validator.isValid(holder(node), ctx.context)).isFalse();

        // Une violation par image fautive, ancrée sur la propriété ; default désactivé une seule fois.
        verify(ctx.context, times(1)).disableDefaultConstraintViolation();
        verify(ctx.context, times(2)).buildConstraintViolationWithTemplate(anyString());
        verify(ctx.builder, times(2)).addPropertyNode("gallery");
    }

    @Test
    void isValid_ignoresReferenceToNonFileNode() throws Exception {
        JCRNodeWrapper notAFile = mock(JCRNodeWrapper.class);
        when(notAFile.isNodeType("nt:file")).thenReturn(false);
        JCRPropertyWrapper ref = property("link", PropertyType.REFERENCE, false, notAFile);
        JCRNodeWrapper node = nodeWith(ref);

        assertThat(validator.isValid(holder(node), newContext())).isTrue();
    }

    @Test
    void isValid_ignoresReferenceToNonImageFile() throws Exception {
        JCRNodeWrapper pdf = imageFile(10 * 1024 * KB, "application/pdf");
        JCRPropertyWrapper ref = property("document", PropertyType.WEAKREFERENCE, false, pdf);
        JCRNodeWrapper node = nodeWith(ref);

        assertThat(validator.isValid(holder(node), newContext())).isTrue();
    }

    @Test
    void isValid_ignoresBrokenReference() throws Exception {
        // Cible null -> la session lève ItemNotFoundException (référence pendante).
        JCRPropertyWrapper ref = property("banner", PropertyType.WEAKREFERENCE, false, (JCRNodeWrapper) null);
        JCRNodeWrapper node = nodeWith(ref);

        assertThat(validator.isValid(holder(node), newContext())).isTrue();
    }

    // ---------------------------------------------------------------------
    // Seuils par catégorie (règles par défaut)
    // ---------------------------------------------------------------------

    @Test
    void isValid_acceptsIconLogoUnderFiftyKb() throws Exception {
        JCRNodeWrapper node = nodeWith(imageProperty("mainLogo", 40 * KB, "image/svg+xml"));

        assertThat(validator.isValid(holder(node), newContext())).isTrue();
    }

    @Test
    void isValid_rejectsIconLogoOverFiftyKb() throws Exception {
        JCRNodeWrapper node = nodeWith(imageProperty("mainLogo", 80 * KB, "image/png"));
        TestContext ctx = newTestContext();

        assertThat(validator.isValid(holder(node), ctx.context)).isFalse();

        verify(ctx.context).disableDefaultConstraintViolation();
        ArgumentCaptor<String> template = ArgumentCaptor.forClass(String.class);
        verify(ctx.context).buildConstraintViolationWithTemplate(template.capture());
        assertThat(template.getValue())
                .contains("Icônes & logos")
                .contains("80 Ko")
                .contains("50 Ko");
        verify(ctx.builder).addPropertyNode("mainLogo");
    }

    @Test
    void isValid_appliesMobileThreshold() throws Exception {
        // 120 Ko : accepté en 'default' (1 Mo) mais rejeté en 'mobile' (100 Ko).
        JCRNodeWrapper node = nodeWith(imageProperty("imageMobile", 120 * KB, "image/webp"));

        assertThat(validator.isValid(holder(node), newContext())).isFalse();
    }

    @Test
    void isValid_appliesTabletThreshold() throws Exception {
        JCRNodeWrapper okTablet = nodeWith(imageProperty("imageTablet", 400 * KB, "image/jpeg"));
        assertThat(validator.isValid(holder(okTablet), newContext())).isTrue();

        JCRNodeWrapper koTablet = nodeWith(imageProperty("imageTablet", 600 * KB, "image/jpeg"));
        assertThat(validator.isValid(holder(koTablet), newContext())).isFalse();
    }

    @Test
    void isValid_appliesDefaultThresholdForUnmatchedName() throws Exception {
        JCRNodeWrapper okDefault = nodeWith(imageProperty("banner", 900 * KB, "image/jpeg"));
        assertThat(validator.isValid(holder(okDefault), newContext())).isTrue();

        JCRNodeWrapper koDefault = nodeWith(imageProperty("banner", 1500 * KB, "image/jpeg"));
        assertThat(validator.isValid(holder(koDefault), newContext())).isFalse();
    }

    @Test
    void isValid_reportsEveryOffendingImageButDisablesDefaultOnce() throws Exception {
        JCRNodeWrapper node = nodeWith(
                imageProperty("mainLogo", 80 * KB, "image/png"),
                imageProperty("imageMobile", 300 * KB, "image/webp"));
        ConstraintValidatorContext ctx = newContext();

        assertThat(validator.isValid(holder(node), ctx)).isFalse();

        verify(ctx, times(1)).disableDefaultConstraintViolation();
        verify(ctx, times(2)).buildConstraintViolationWithTemplate(anyString());
    }

    @Test
    void isValid_matchingIsCaseInsensitive() throws Exception {
        JCRNodeWrapper node = nodeWith(imageProperty("HeaderICONSmall", 80 * KB, "image/png"));

        // 'ICON' (majuscules) doit toujours mapper la règle icon-logo (50 Ko) → rejet.
        assertThat(validator.isValid(holder(node), newContext())).isFalse();
    }

    // ---------------------------------------------------------------------
    // Overlay de la policy configurée (sofnt:imageWeightPolicy)
    // ---------------------------------------------------------------------

    @Test
    void isValid_configuredRuleOverridesDefaultThreshold() throws Exception {
        // Config : catégorie icon-logo relevée à 200 Ko (inheritDefaults implicite = true).
        JCRNodeWrapper ruleNode = ruleNode("icon-logo", 200L);
        JCRNodeWrapper policyNode = policyNode(ruleNode);
        JCRNodeIteratorWrapper settingsChildren = nodeIterator(policyNode);
        JCRNodeWrapper siteSettings = mock(JCRNodeWrapper.class);
        when(siteSettings.getNodes()).thenReturn(settingsChildren);

        JCRSiteNode site = mock(JCRSiteNode.class);
        when(site.hasNode("contents/site-settings")).thenReturn(true);
        when(site.getNode("contents/site-settings")).thenReturn(siteSettings);

        JCRNodeWrapper node = nodeWith(imageProperty("mainLogo", 150 * KB, "image/png"));
        when(node.getResolveSite()).thenReturn(site);

        // 150 Ko : rejeté par défaut (50 Ko), accepté avec la policy (200 Ko).
        assertThat(validator.isValid(holder(node), newContext())).isTrue();
    }

    @Test
    void isValid_fallsBackToDefaultsWhenPolicyIsAbsent() throws Exception {
        JCRSiteNode site = mock(JCRSiteNode.class);
        when(site.hasNode("contents/site-settings")).thenReturn(false);

        JCRNodeWrapper node = nodeWith(imageProperty("mainLogo", 80 * KB, "image/png"));
        when(node.getResolveSite()).thenReturn(site);

        // Pas de policy → repli sur les défauts → 80 Ko dépasse 50 Ko.
        assertThat(validator.isValid(holder(node), newContext())).isFalse();
    }

    @Test
    void isValid_fallsBackToDefaultsWhenPolicyReadThrows() throws Exception {
        JCRNodeWrapper node = nodeWith(imageProperty("mainLogo", 80 * KB, "image/png"));
        when(node.getResolveSite()).thenThrow(new RepositoryException("site unreachable"));

        assertThat(validator.isValid(holder(node), newContext())).isFalse();
    }

    // ---------------------------------------------------------------------
    // Éviction du cache à la sauvegarde de la config (piggyback)
    // ---------------------------------------------------------------------

    @Test
    void isValid_onConfigNode_returnsTrueWithoutRunningImageChecks() throws Exception {
        JCRNodeWrapper policyNode = mock(JCRNodeWrapper.class);
        when(policyNode.isNodeType("sofnt:imageWeightPolicy")).thenReturn(true);
        when(policyNode.getResolveSite()).thenReturn(null); // invalidate -> no-op

        assertThat(validator.isValid(holder(policyNode), newContext())).isTrue();
        // Un noeud de config ne porte pas d'image : aucun parcours de propriétés.
        verify(policyNode, never()).getProperties();
    }

    @Test
    void isValid_savingConfigNode_evictsThatSitesCache() throws Exception {
        JCRSiteNode site = mock(JCRSiteNode.class);
        when(site.getIdentifier()).thenReturn("site:piggyback");
        when(site.hasNode("contents/site-settings")).thenReturn(false); // pas de policy -> défauts

        JCRNodeWrapper content = mock(JCRNodeWrapper.class);
        when(content.getResolveSite()).thenReturn(site);

        // 1) 1er accès : lit la config du site et met en cache.
        ImageWeightPolicy.forNode(content);

        // 2) Sauvegarde d'un noeud de règle du MÊME site via le validateur -> éviction ciblée.
        JCRNodeWrapper ruleNode = mock(JCRNodeWrapper.class);
        when(ruleNode.isNodeType("sofnt:imageWeightRule")).thenReturn(true);
        when(ruleNode.getResolveSite()).thenReturn(site);
        assertThat(validator.isValid(holder(ruleNode), newContext())).isTrue();

        // 3) Accès suivant : cache évincé -> relecture (hasNode appelé une 2e fois).
        ImageWeightPolicy.forNode(content);

        verify(site, times(2)).hasNode("contents/site-settings");
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private static ImageWeightNodeValidator holder(JCRNodeWrapper node) {
        return new ImageWeightNodeValidator(node);
    }

    /** Noeud dont getProperties() itère sur les propriétés fournies ; sans site résolu. */
    private static JCRNodeWrapper nodeWith(JCRPropertyWrapper... properties) throws Exception {
        PropertyIterator iterator = propertyIterator(properties);
        JCRNodeWrapper node = mock(JCRNodeWrapper.class);
        when(node.getProperties()).thenReturn(iterator);
        when(node.getResolveSite()).thenReturn(null);
        return node;
    }

    /** Propriété référence simple pointant vers un fichier image de taille/mime donnés. */
    private static JCRPropertyWrapper imageProperty(String name, long sizeBytes, String mime) throws Exception {
        return property(name, PropertyType.WEAKREFERENCE, false, imageFile(sizeBytes, mime));
    }

    /**
     * Propriété reference/weakreference (mono- ou multi-valuée). Chaque cible est exposée comme
     * une valeur référence (UUID) résolue via la session, comme en JCR réel. Une cible {@code null}
     * simule une référence cassée (la session lève {@link ItemNotFoundException}).
     */
    private static JCRPropertyWrapper property(String name, int requiredType, boolean multiple,
            JCRNodeWrapper... targets) throws Exception {
        JCRPropertyWrapper prop = mock(JCRPropertyWrapper.class);
        ExtendedPropertyDefinition def = mock(ExtendedPropertyDefinition.class);
        when(def.getRequiredType()).thenReturn(requiredType);
        when(prop.getDefinition()).thenReturn(def);
        when(prop.isMultiple()).thenReturn(multiple);
        when(prop.getName()).thenReturn(name);

        JCRSessionWrapper session = mock(JCRSessionWrapper.class);
        JCRValueWrapper[] values = new JCRValueWrapper[targets.length];
        for (int i = 0; i < targets.length; i++) {
            String uuid = name + "#" + i;
            JCRValueWrapper value = mock(JCRValueWrapper.class);
            when(value.getString()).thenReturn(uuid);
            values[i] = value;
            if (targets[i] != null) {
                when(session.getNodeByIdentifier(uuid)).thenReturn(targets[i]);
            } else {
                when(session.getNodeByIdentifier(uuid))
                        .thenThrow(new ItemNotFoundException("broken reference"));
            }
        }
        when(prop.getSession()).thenReturn(session);
        if (multiple) {
            when(prop.getValues()).thenReturn(values);
        } else if (values.length > 0) {
            when(prop.getValue()).thenReturn(values[0]);
        }
        return prop;
    }

    private static JCRNodeWrapper imageFile(long sizeBytes, String mime) throws Exception {
        JCRNodeWrapper file = mock(JCRNodeWrapper.class);
        when(file.isNodeType("nt:file")).thenReturn(true);
        JCRFileContent content = mock(JCRFileContent.class);
        when(content.getContentType()).thenReturn(mime);
        when(content.getContentLength()).thenReturn(sizeBytes);
        when(file.getFileContent()).thenReturn(content);
        return file;
    }

    private static JCRNodeWrapper ruleNode(String category, long maxSizeKb) throws Exception {
        JCRPropertyWrapper categoryProp = stringProperty(category);
        JCRPropertyWrapper maxSizeProp = longProperty(maxSizeKb);
        JCRNodeWrapper rule = mock(JCRNodeWrapper.class);
        when(rule.isNodeType("sofnt:imageWeightRule")).thenReturn(true);
        when(rule.hasProperty("category")).thenReturn(true);
        when(rule.getProperty("category")).thenReturn(categoryProp);
        when(rule.hasProperty("inheritDefaults")).thenReturn(false); // -> inherit = true (défaut)
        when(rule.hasProperty("maxSizeKb")).thenReturn(true);
        when(rule.getProperty("maxSizeKb")).thenReturn(maxSizeProp);
        when(rule.hasProperty("matchTokens")).thenReturn(false);
        return rule;
    }

    private static JCRNodeWrapper policyNode(JCRNodeWrapper... rules) throws Exception {
        JCRNodeIteratorWrapper iterator = nodeIterator(rules);
        JCRNodeWrapper policy = mock(JCRNodeWrapper.class);
        when(policy.isNodeType("sofnt:imageWeightPolicy")).thenReturn(true);
        when(policy.getNodes()).thenReturn(iterator);
        return policy;
    }

    private static JCRPropertyWrapper stringProperty(String value) throws Exception {
        JCRPropertyWrapper prop = mock(JCRPropertyWrapper.class);
        when(prop.getString()).thenReturn(value);
        return prop;
    }

    private static JCRPropertyWrapper longProperty(long value) throws Exception {
        JCRPropertyWrapper prop = mock(JCRPropertyWrapper.class);
        when(prop.getLong()).thenReturn(value);
        return prop;
    }

    private static PropertyIterator propertyIterator(JCRPropertyWrapper... properties) {
        final Iterator<JCRPropertyWrapper> delegate = Arrays.asList(properties).iterator();
        PropertyIterator it = mock(PropertyIterator.class);
        when(it.hasNext()).thenAnswer(inv -> delegate.hasNext());
        when(it.nextProperty()).thenAnswer(inv -> delegate.next());
        return it;
    }

    private static JCRNodeIteratorWrapper nodeIterator(JCRNodeWrapper... nodes) {
        final Iterator<JCRNodeWrapper> delegate = Arrays.asList(nodes).iterator();
        JCRNodeIteratorWrapper it = mock(JCRNodeIteratorWrapper.class);
        when(it.hasNext()).thenAnswer(inv -> delegate.hasNext());
        when(it.nextNode()).thenAnswer(inv -> delegate.next());
        return it;
    }

    /** Contexte de validation avec la chaîne fluent buildConstraintViolation…() entièrement stubbée. */
    private static ConstraintValidatorContext newContext() {
        return newTestContext().context;
    }

    private static TestContext newTestContext() {
        ConstraintValidatorContext ctx = mock(ConstraintValidatorContext.class);
        ConstraintViolationBuilder builder = mock(ConstraintViolationBuilder.class);
        NodeBuilderCustomizableContext nodeContext = mock(NodeBuilderCustomizableContext.class);
        when(ctx.buildConstraintViolationWithTemplate(anyString())).thenReturn(builder);
        when(builder.addPropertyNode(anyString())).thenReturn(nodeContext);
        when(nodeContext.addConstraintViolation()).thenReturn(ctx);
        return new TestContext(ctx, builder);
    }

    /** Regroupe le contexte et son builder pour permettre les vérifications fluent. */
    private static final class TestContext {
        final ConstraintValidatorContext context;
        final ConstraintViolationBuilder builder;

        TestContext(ConstraintValidatorContext context, ConstraintViolationBuilder builder) {
            this.context = context;
            this.builder = builder;
        }
    }
}
