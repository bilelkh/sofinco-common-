package ch.sofinco.core.validation.simulation;

import ch.sofinco.core.client.ApimSimulationClient;
import ch.sofinco.core.exception.ApimErrorKind;
import ch.sofinco.core.exception.ApimException;
import ch.sofinco.core.model.representativeexample.CampaignResponse;
import ch.sofinco.core.service.ApimService;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Traduction d'une réponse APIM en verdict de validation.
 *
 * <p>Tout l'enjeu tient en une règle : <b>seule une réponse HTTP négative bloque une
 * sauvegarde</b>. Cet endpoint hérité répond 500 là où un 404 serait attendu — vérifié en
 * production — et les deux valent donc « provenance introuvable ».
 *
 * <p>Une panne SANS réponse HTTP, elle, ne bloque rien : coupure réseau, délai dépassé, APIM non
 * configuré, mode mock. C'est la forme la plus fréquente d'indisponibilité, et un contrôle qui
 * empêcherait de sauvegarder dans ces cas coûterait au contributeur son travail en cours pour un
 * incident dont il n'est pas responsable.
 */
class CampaignLookupTest {

    private final ApimService apim = mock(ApimService.class);
    private final ApimSimulationClient client = mock(ApimSimulationClient.class);

    /**
     * Les verdicts sont memorises dans une table STATIQUE, partagee par toute la JVM. Sans remise a
     * zero, un test heriterait du verdict d'un autre et l'ordre d'execution deviendrait significatif.
     */
    @org.junit.jupiter.api.BeforeEach
    void clearMemorizedVerdicts() {
        CampaignLookup.clearCache();
    }

    private static CampaignResponse campaign() {
        return new CampaignResponse("NEOURL41", "loan", "PRÊT PERSONNEL",
                3001.0, 75000.0, 12, 120, null, null, null, null, null, null, null);
    }

    private void apimReady() {
        when(apim.isReady()).thenReturn(true);
        when(apim.isMockMode()).thenReturn(false);
        when(apim.getOrigin()).thenReturn(null);
    }

    private CampaignLookup lookup() {
        return CampaignLookup.forSource(apim, client, "NEOURL41");
    }

    // ------------------------------------------------------------------ memorisation

    /**
     * LE cas qui justifie le cache. Aucun script du depot n'appelle
     * {@code session.setSkipValidation(true)} : une migration posant le mixin sur trois cents pages
     * declencherait autant d'appels APIM, sur une poignee de provenances distinctes.
     */
    @Test
    void repeatedValidationsOfTheSameSource_hitApimOnlyOnce() throws Exception {
        apimReady();
        when(client.callCampaignApi(any(), any(), any())).thenReturn(Optional.of(campaign()));

        for (int i = 0; i < 50; i++) {
            assertThat(lookup().status()).isEqualTo(CampaignLookup.Status.FOUND);
        }

        verify(client, org.mockito.Mockito.times(1)).callCampaignApi(any(), any(), any());
    }

    /** Un refus se memorise aussi : une migration rejouant la meme faute n'interroge qu'une fois. */
    @Test
    void aRejectedSourceIsAlsoMemorized() throws Exception {
        apimReady();
        when(client.callCampaignApi(any(), any(), any())).thenThrow(
                new ApimException(ApimErrorKind.RESOURCE_NOT_FOUND, "HTTP 500"));

        lookup();
        lookup();

        verify(client, org.mockito.Mockito.times(1)).callCampaignApi(any(), any(), any());
    }

    /**
     * Chaque provenance a son entree : corriger un code fautif interroge l'APIM avec la NOUVELLE
     * valeur, sans etre juge sur le verdict de l'ancienne.
     */
    @Test
    void correctingTheSourceCode_isJudgedOnTheNewValue() throws Exception {
        apimReady();
        when(client.callCampaignApi("XXXX", null, null)).thenThrow(
                new ApimException(ApimErrorKind.RESOURCE_NOT_FOUND, "HTTP 500"));
        when(client.callCampaignApi("NEOURL41", null, null)).thenReturn(Optional.of(campaign()));

        assertThat(CampaignLookup.forSource(apim, client, "XXXX").status())
                .isEqualTo(CampaignLookup.Status.UNKNOWN_SOURCE);
        assertThat(CampaignLookup.forSource(apim, client, "NEOURL41").status())
                .isEqualTo(CampaignLookup.Status.FOUND);
    }

    /**
     * « Je ne sais pas » ne se memorise JAMAIS : un APIM revenu en ligne doit etre reinterroge
     * immediatement, pas ignore le temps d'une entree de cache.
     */
    @Test
    void anUnavailableVerdict_isRetriedOnTheNextSave() throws Exception {
        apimReady();
        when(client.callCampaignApi(any(), any(), any()))
                .thenThrow(new java.io.IOException("timeout"))
                .thenReturn(Optional.of(campaign()));

        assertThat(lookup().status()).isEqualTo(CampaignLookup.Status.UNAVAILABLE);
        assertThat(lookup().status())
                .as("la panne ne doit pas etre memorisee")
                .isEqualTo(CampaignLookup.Status.FOUND);
    }

    // ------------------------------------------------------------------ le seul cas bloquant

    @Test
    void a404_meansTheSourceDoesNotExist() throws Exception {
        apimReady();
        when(client.callCampaignApi(any(), any(), any())).thenThrow(
                new ApimException(ApimErrorKind.RESOURCE_NOT_FOUND, "Campagne introuvable"));

        assertThat(lookup().status()).isEqualTo(CampaignLookup.Status.UNKNOWN_SOURCE);
    }

    // ------------------------------------------------------------------ tout le reste laisse passer

    @Test
    void aResolvedCampaign_isFound() throws Exception {
        apimReady();
        when(client.callCampaignApi(any(), any(), any())).thenReturn(Optional.of(campaign()));

        CampaignLookup result = lookup();
        assertThat(result.status()).isEqualTo(CampaignLookup.Status.FOUND);
        assertThat(result.campaign().id()).isEqualTo("NEOURL41");
    }

    @Test
    void unresolvedServices_yieldUnavailable() {
        assertThat(CampaignLookup.forSource(null, client, "X").status())
                .isEqualTo(CampaignLookup.Status.UNAVAILABLE);
        assertThat(CampaignLookup.forSource(apim, null, "X").status())
                .isEqualTo(CampaignLookup.Status.UNAVAILABLE);
    }

    /**
     * MODE MOCK : les campagnes sont des fixtures. Les comparer refuserait des saisies parfaitement
     * correctes, sur un environnement où la donnée réelle n'existe pas.
     */
    @Test
    void mockMode_yieldsUnavailableWithoutCallingApim() throws Exception {
        when(apim.isReady()).thenReturn(true);
        when(apim.isMockMode()).thenReturn(true);

        assertThat(lookup().status()).isEqualTo(CampaignLookup.Status.UNAVAILABLE);
        verify(client, never()).callCampaignApi(any(), any(), any());
    }

    @Test
    void anUnconfiguredApim_yieldsUnavailableWithoutCalling() throws Exception {
        when(apim.isReady()).thenReturn(false);
        when(apim.isMockMode()).thenReturn(false);

        assertThat(lookup().status()).isEqualTo(CampaignLookup.Status.UNAVAILABLE);
        verify(client, never()).callCampaignApi(any(), any(), any());
    }

    @Test
    void anEmptyResponse_yieldsUnavailable() throws Exception {
        apimReady();
        when(client.callCampaignApi(any(), any(), any())).thenReturn(Optional.empty());

        assertThat(lookup().status()).isEqualTo(CampaignLookup.Status.UNAVAILABLE);
    }

    /** Une panne APIM ne doit JAMAIS empêcher un contributeur d'enregistrer sa page. */
    @Test
    void anApimFailureOtherThan404_yieldsUnavailable() throws Exception {
        apimReady();
        when(client.callCampaignApi(any(), any(), any())).thenThrow(
                new ApimException(ApimErrorKind.SERVER_ERROR, "503"));

        assertThat(lookup().status()).isEqualTo(CampaignLookup.Status.UNAVAILABLE);
    }

    /**
     * DES IDENTIFIANTS APIM EXPIRES NE SONT PAS UNE PROVENANCE INEXISTANTE.
     *
     * <p>C'est le cas qui motive tout le traitement : un 401 dit que NOUS ne sommes plus
     * authentifies, pas que la campagne du contributeur n'existe pas. Le confondre rendait toute
     * page portant le mixin insauvegardable des l'expiration du jeton, avec un message accusant
     * un code de campagne pourtant correct.
     *
     * <p>Ce test verrouille le comportement de bout en bout, la ou
     * {@code HttpApimSimulationClientTest} ne verifie que le TYPE d'exception : ce qui compte
     * pour le contributeur, c'est que la sauvegarde passe.
     */
    @Test
    void expiredApimCredentials_neverBlockASave() throws Exception {
        apimReady();
        when(client.callCampaignApi(any(), any(), any())).thenThrow(
                new ApimException(ApimErrorKind.AUTH_REJECTED, "HTTP 401 persistant"));

        assertThat(lookup().status()).isEqualTo(CampaignLookup.Status.UNAVAILABLE);
    }

    /**
     * Et le doute n'est PAS memorise : le verdict « indisponible » doit etre reessaye a la
     * sauvegarde suivante, sinon une panne de 2 secondes condamnerait la page pour 60.
     */
    @Test
    void anAuthFailureIsNotMemorized() throws Exception {
        apimReady();
        when(client.callCampaignApi(any(), any(), any())).thenThrow(
                new ApimException(ApimErrorKind.AUTH_REJECTED, "HTTP 401 persistant"));

        lookup();
        lookup();

        verify(client, times(2)).callCampaignApi(any(), any(), any());
    }

    @Test
    void aNetworkFailure_yieldsUnavailable() throws Exception {
        apimReady();
        when(client.callCampaignApi(any(), any(), any())).thenThrow(new IOException("timeout"));

        assertThat(lookup().status()).isEqualTo(CampaignLookup.Status.UNAVAILABLE);
    }

    /** Même une défaillance inattendue du service reste sans effet sur la sauvegarde. */
    @Test
    void anUnexpectedRuntimeFailure_yieldsUnavailable() throws Exception {
        apimReady();
        when(client.callCampaignApi(any(), any(), any())).thenThrow(new IllegalStateException("boum"));

        assertThat(lookup().status()).isEqualTo(CampaignLookup.Status.UNAVAILABLE);
    }

    /** L'{@code Origin} configuré est transmis : l'APIM le contrôle sur certaines passerelles. */
    @Test
    void theConfiguredOriginIsForwarded() throws Exception {
        apimReady();
        when(apim.getOrigin()).thenReturn("https://www.sofinco.fr");
        when(client.callCampaignApi(any(), any(), any())).thenReturn(Optional.of(campaign()));

        lookup();

        verify(client).callCampaignApi("NEOURL41", null, "https://www.sofinco.fr");
    }
}
