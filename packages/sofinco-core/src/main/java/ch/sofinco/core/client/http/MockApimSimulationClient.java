package ch.sofinco.core.client.http;

import ch.sofinco.core.client.ApimSimulationClient;
import ch.sofinco.core.enums.CreditVariant;
import ch.sofinco.core.exception.ApimException;
import ch.sofinco.core.model.representativeexample.CampaignResponse;
import ch.sofinco.core.model.representativeexample.LoanCalculateResponse;
import ch.sofinco.core.model.representativeexample.RevolvingCalculateResponse;
import ch.sofinco.core.util.JsonFacade;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import java.util.Optional;

/**
 * Implémentation Mock de {@link ApimSimulationClient} pour dev local / démos hors-ligne.
 * Lit les fixtures JSON depuis {@code /mocks/*.json} (extractions de vraies réponses APIM
 * recette via curl). Chemins portés par {@link CreditVariant#mockResourcePath()}.
 *
 * <p>Instancié par {@link ch.sofinco.core.client.ApimSimulationClientFactory} uniquement si
 * {@code mockMode=true}. Désérialisation via {@link JsonFacade} (le mapper Jackson n'est jamais
 * exposé publiquement).
 *
 * <p>Validation des entrées partagée avec {@link HttpApimSimulationClient} (parité Mock/HTTP) :
 * un bug visible en mock ne doit pas disparaître en live, ni l'inverse.
 *
 * <p>Stateless, thread-safe.
 */
public class MockApimSimulationClient implements ApimSimulationClient {

    private static final Logger LOG = LoggerFactory.getLogger(MockApimSimulationClient.class);

    /**
     * Fixtures campagne — extractions de vraies reponses APIM de production, une par variante.
     *
     * <p>Le mock ne peut pas deviner l'enveloppe d'une provenance qu'il ne connait pas : il retombe
     * alors sur le Pret Personnel. C'est le repli le moins surprenant, et surtout le seul qui
     * garde le mode mock utilisable — renvoyer vide y ferait echouer des rendus corrects.
     */
    private static final String CAMPAIGN_PB_MOCK = "/mocks/campaign_pb_response.json";
    private static final String CAMPAIGN_CR_MOCK = "/mocks/campaign_cr_response.json";
    private static final String CAMPAIGN_RAC_MOCK = "/mocks/campaign_rac_response.json";

    /** Provenance du Credit Renouvelable en recette, comme {@code NEOURL04} l'est pour le RAC. */
    private static final String CR_SOURCE_CODE = "NEOURL02";

    public MockApimSimulationClient() {
        // stateless
    }

    @Override
    public Optional<LoanCalculateResponse> callLoanApi(String sourceCode, long amount, long duration,
                                                       String scaleCode, String effectiveOrigin)
            throws ApimException, IOException {
        HttpApimSimulationClient.validateAmountAndDuration(amount, duration);
        CreditVariant variant = isRacSourceCode(sourceCode)
                ? CreditVariant.RACHAT_CREDIT : CreditVariant.PRET_PERSO;
        String resource = variant.mockResourcePath();
        LOG.debug("Mock APIM loan call (sourceCode={}, variant={}) → {}", sourceCode, variant, resource);
        return Optional.ofNullable(loadFixture(resource, LoanCalculateResponse.class));
    }

    @Override
    public Optional<RevolvingCalculateResponse> callRevolvingApi(String sourceCode, long amount, long duration,
                                                                 String effectiveOrigin)
            throws ApimException, IOException {
        HttpApimSimulationClient.validateAmountAndDuration(amount, duration);
        String resource = CreditVariant.CREDIT_RENOUVELABLE.mockResourcePath();
        LOG.debug("Mock APIM revolving call (sourceCode={}) → {}", sourceCode, resource);
        return Optional.ofNullable(loadFixture(resource, RevolvingCalculateResponse.class));
    }

    /**
     * {@inheritDoc}
     *
     * <p>Fixture choisie par la PROVENANCE, jamais par le produit : contrairement aux
     * simulations, une campagne ne depend pas du type de credit. Le mock route donc entre trois
     * fixtures — PB, CR, RAC — sur le seul {@code sourceCode}, et le parametre {@code product}
     * n'entre pas dans le choix.
     */
    @Override
    public Optional<CampaignResponse> callCampaignApi(String sourceCode, String product,
                                                      String effectiveOrigin)
            throws IOException {
        String resource = campaignMockPath(sourceCode);
        LOG.debug("Mock APIM campaign call (sourceCode={}) → {}", sourceCode, resource);
        return Optional.ofNullable(loadFixture(resource, CampaignResponse.class));
    }

    /**
     * Fixture correspondant a une provenance.
     *
     * <p>Reutilise {@link #isRacSourceCode} plutot qu'une seconde heuristique : le mode mock doit
     * router une provenance de la MEME facon pour la simulation et pour la campagne, faute de quoi
     * un developpeur verrait un exemple de Rachat de Credits encadre par les bornes d'un Pret
     * Personnel — une incoherence qui n'existe sur aucun environnement reel.
     */
    static String campaignMockPath(String sourceCode) {
        if (isRacSourceCode(sourceCode)) {
            return CAMPAIGN_RAC_MOCK;
        }
        if (sourceCode != null && CR_SOURCE_CODE.equals(sourceCode.toUpperCase(Locale.ROOT))) {
            return CAMPAIGN_CR_MOCK;
        }
        return CAMPAIGN_PB_MOCK;
    }

    /**
     * Heuristique simple : {@code "NEOURL04"} connu, ou {@code sourceCode} contenant
     * {@code "RAC"} (insensible à la casse). {@link Locale#ROOT} anti Turkish-i.
     */
    static boolean isRacSourceCode(String sourceCode) {
        if (sourceCode == null) {
            return false;
        }
        String upper = sourceCode.toUpperCase(Locale.ROOT);
        return "NEOURL04".equals(upper) || upper.contains("RAC");
    }

    private <T> T loadFixture(String resource, Class<T> type) throws IOException {
        try (InputStream in = MockApimSimulationClient.class.getResourceAsStream(resource)) {
            if (in == null) {
                throw new IOException("Mock fixture introuvable: " + resource);
            }
            return JsonFacade.readValue(in, type);
        }
    }
}
