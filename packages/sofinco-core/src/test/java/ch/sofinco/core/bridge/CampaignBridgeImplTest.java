package ch.sofinco.core.bridge;

import ch.sofinco.core.model.representativeexample.CampaignResponse;
import ch.sofinco.core.model.representativeexample.SimulationParams;
import ch.sofinco.core.service.CampaignService;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapper;
import org.junit.jupiter.api.Test;

import javax.jcr.RepositoryException;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Frontière JS de {@link CampaignBridgeImpl}.
 *
 * <p>Ce qui est vérifié ici n'est pas le calcul — il appartient au service et au mapper — mais le
 * CONTRAT DE FRONTIÈRE : rien ne lève, l'absence s'exprime par {@code null}, et le pont n'appelle
 * le service que lorsque la page porte réellement une provenance.
 */
class CampaignBridgeImplTest {

    private final CampaignService service = mock(CampaignService.class);
    private final RequestOriginProvider originProvider = mock(RequestOriginProvider.class);
    private final CampaignBridgeImpl bridge = new CampaignBridgeImpl(service, originProvider);

    // ------------------------------------------------------------------ fixtures

    private static CampaignResponse campaign() {
        return new CampaignResponse("NEOURL41", "loan", "PRÊT PERSONNEL",
                3001.0, 75000.0, 12, 120,
                4.314, 14.628, 4.4, 15.65, 4.9,
                "2017-09-25", "2026-08-26");
    }

    /** Page portant en plus un type de credit — l'INDICATION de routage APIM. */
    private static JCRNodeWrapper pageWithProduct(String sourceId, String product)
            throws RepositoryException {
        JCRNodeWrapper page = page(true, sourceId);
        JCRPropertyWrapper p = mock(JCRPropertyWrapper.class);
        when(p.getString()).thenReturn(product);
        when(page.hasProperty(SimulationParams.PROP_PRODUCT)).thenReturn(true);
        when(page.getProperty(SimulationParams.PROP_PRODUCT)).thenReturn(p);
        return page;
    }

    private static JCRNodeWrapper page(boolean mixin, String sourceId) throws RepositoryException {
        JCRNodeWrapper page = mock(JCRNodeWrapper.class);
        when(page.getPath()).thenReturn("/sites/sofinco/home/pb");
        when(page.isNodeType("jnt:page")).thenReturn(true);
        when(page.isNodeType(SimulationParams.MIXIN)).thenReturn(mixin);
        if (sourceId != null) {
            JCRPropertyWrapper p = mock(JCRPropertyWrapper.class);
            when(p.getString()).thenReturn(sourceId);
            when(page.hasProperty(SimulationParams.PROP_SOURCE_ID)).thenReturn(true);
            when(page.getProperty(SimulationParams.PROP_SOURCE_ID)).thenReturn(p);
        }
        return page;
    }

    // ------------------------------------------------------------------ tests

    @Test
    void nullNode_yieldsNullWithoutCallingTheService() {
        assertThat(bridge.getCampaignVars(null)).isNull();
        verify(service, never()).getCampaign(any(), any(), any());
    }

    /** Page sans mixin : rien à interroger, et surtout aucun appel émis. */
    @Test
    void pageWithoutTheMixin_yieldsNullWithoutCallingTheService() throws Exception {
        assertThat(bridge.getCampaignVars(page(false, null))).isNull();
        verify(service, never()).getCampaign(any(), any(), any());
    }

    /** Mixin posé mais provenance vide : idem — c'est l'audit qui le signale, pas un appel. */
    @Test
    void mixinWithoutSourceId_yieldsNullWithoutCallingTheService() throws Exception {
        assertThat(bridge.getCampaignVars(page(true, null))).isNull();
        verify(service, never()).getCampaign(any(), any(), any());
    }

    @Test
    void aResolvedCampaign_yieldsFormattedTokens() throws Exception {
        when(service.getCampaign(eq("NEOURL41"), any(), any())).thenReturn(Optional.of(campaign()));

        Map<String, Object> vars = bridge.getCampaignVars(page(true, "NEOURL41"));

        assertThat(vars)
                .isNotNull()
                .containsEntry("minDuration", "12")
                .containsEntry("endDate", "26/08/2026")
                .doesNotContainKeys("id", "type", "label");
    }

    /** L'{@code Origin} de la requête entrante est transmis au service quand il existe. */
    @Test
    void theRequestOriginIsForwarded() throws Exception {
        when(originProvider.currentOrigin()).thenReturn("https://www.sofinco.fr");
        when(service.getCampaign(any(), any(), any())).thenReturn(Optional.of(campaign()));

        bridge.getCampaignVars(page(true, "NEOURL41"));

        verify(service).getCampaign("NEOURL41", null, "https://www.sofinco.fr");
    }

    /** Fournisseur d'Origin absent (référence OSGi optionnelle) : le service décide seul. */
    @Test
    void withoutAnOriginProvider_nullIsForwarded() throws Exception {
        CampaignBridgeImpl bare = new CampaignBridgeImpl(service, null);
        when(service.getCampaign(any(), any(), any())).thenReturn(Optional.of(campaign()));

        bare.getCampaignVars(page(true, "NEOURL41"));

        verify(service).getCampaign("NEOURL41", null, null);
    }

    /**
     * Le type de credit de la page est transmis comme INDICATION DE ROUTAGE : il choisit la racine
     * APIM cohérente avec l'endpoint {@code calculate} du produit. Il ne conditionne rien — les
     * deux racines servent la même campagne.
     */
    @Test
    void thePageProductIsForwardedAsARoutingHint() throws Exception {
        when(service.getCampaign(any(), any(), any())).thenReturn(Optional.of(campaign()));

        bridge.getCampaignVars(pageWithProduct("NEOURL41", "PB"));

        verify(service).getCampaign("NEOURL41", "PB", null);
    }

    /**
     * Et son absence n'empêche RIEN : une page sans type de crédit garde ses bornes d'offre, le
     * client retombant sur la racine qui sert toutes les campagnes.
     */
    @Test
    void aMissingProductStillResolvesTheCampaign() throws Exception {
        when(service.getCampaign(any(), any(), any())).thenReturn(Optional.of(campaign()));

        assertThat(bridge.getCampaignVars(page(true, "NEOURL41"))).isNotNull();
        verify(service).getCampaign("NEOURL41", null, null);
    }

    @Test
    void anAbsentCampaign_yieldsNull() throws Exception {
        when(service.getCampaign(any(), any(), any())).thenReturn(Optional.empty());
        assertThat(bridge.getCampaignVars(page(true, "NEOURL41"))).isNull();
    }

    /**
     * AUCUNE RuntimeException ne doit franchir cette frontière : le moteur
     * {@code javascript-modules-engine} cascade sinon en « bodyEndTag is null », qui casse la page
     * entière et non le seul fragment fautif.
     */
    @Test
    void aServiceFailure_yieldsNullRatherThanBreakingTheWholePage() throws Exception {
        when(service.getCampaign(any(), any(), any())).thenThrow(new IllegalStateException("boum"));

        assertThat(bridge.getCampaignVars(page(true, "NEOURL41"))).isNull();
    }

    @Test
    void activate_doesNotThrow() {
        new CampaignBridgeImpl().activate();
    }
}
