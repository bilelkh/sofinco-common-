package ch.sofinco.core.client;

import ch.sofinco.core.client.http.HttpApimSimulationClient;
import ch.sofinco.core.client.http.MockApimSimulationClient;
import ch.sofinco.core.config.ApimConfig;
import ch.sofinco.core.exception.ApimException;
import ch.sofinco.core.model.representativeexample.CampaignResponse;
import ch.sofinco.core.model.representativeexample.LoanCalculateResponse;
import ch.sofinco.core.model.representativeexample.RevolvingCalculateResponse;
import ch.sofinco.core.service.ApimService;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Deactivate;
import org.osgi.service.component.annotations.Modified;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ServiceScope;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Factory + Wrapper OSGi pour {@link ApimSimulationClient}. Seul {@code @Component} exposé
 * dans le service registry : instancie {@link HttpApimSimulationClient} ou
 * {@link MockApimSimulationClient} par composition selon {@code mockMode}.
 *
 * <p>Cette approche évite un bug Felix DS rencontré quand une impl {@code @Component} refuse
 * son activation (« Service factory returned null »). En centralisant l'activation sur ce
 * seul composant, le service registry ne dépend pas de l'état dynamique d'une impl.
 *
 * <p>Hot-reload : partage le {@code configurationPid="ch.sofinco.core.apim"} avec
 * {@link ApimService} ; {@code @Modified} swap le delegate uniquement si {@code mockMode}
 * a changé. {@code mockMode} est lu directement depuis l'{@link ApimConfig} reçue par DS,
 * pas depuis {@code apimService.isMockMode()} (insensibilité à l'ordre des callbacks DS).
 */
@Component(
        service = ApimSimulationClient.class,
        immediate = true,
        scope = ServiceScope.SINGLETON,
        configurationPid = "ch.sofinco.core.apim"
)
public class ApimSimulationClientFactory implements ApimSimulationClient {

    private static final Logger LOG = LoggerFactory.getLogger(ApimSimulationClientFactory.class);

    @Reference
    private ApimService apimService;

    private final Object lock = new Object();
    private final AtomicReference<ApimSimulationClient> delegate = new AtomicReference<>();
    private volatile boolean currentMockMode;

    public ApimSimulationClientFactory() {
        // câblage via @Reference / @Activate
    }

    /** Seam de test : injection directe d'un ApimService mocké. Package-private. */
    ApimSimulationClientFactory(ApimService apimService) {
        this.apimService = apimService;
    }

    @Activate
    public void activate(ApimConfig config) {
        boolean mockMode = config != null && config.mockMode();
        LOG.info("ApimSimulationClientFactory @Activate : mockMode={}", mockMode);
        rebindDelegate(mockMode, "activate");
    }

    @Modified
    public void modified(ApimConfig config) {
        boolean newMockMode = config != null && config.mockMode();
        if (newMockMode != currentMockMode || delegate.get() == null) {
            LOG.info("ApimSimulationClientFactory @Modified : mockMode {} → {}, swap delegate",
                    currentMockMode, newMockMode);
            rebindDelegate(newMockMode, "modified");
        } else {
            LOG.info("ApimSimulationClientFactory @Modified : mockMode inchangé ({}), pas de swap — "
                    + "nouveaux URL/clé/timeouts déjà appliqués par ApimService, lus en live par le delegate",
                    newMockMode ? "MOCK" : "HTTP");
        }
    }

    @Deactivate
    public void deactivate() {
        synchronized (lock) {
            this.delegate.set(null);
        }
        LOG.info("ApimSimulationClientFactory désactivé");
    }

    private void rebindDelegate(boolean mockMode, String reason) {
        synchronized (lock) {
            if (mockMode) {
                this.delegate.set(new MockApimSimulationClient());
                LOG.warn("⚠ ApimSimulationClient = MockApimSimulationClient [{}] — aucun appel APIM réel. "
                        + "Si on est sur recette/intégration/prod : ALERTE.", reason);
            } else {
                this.delegate.set(new HttpApimSimulationClient(apimService));
                LOG.info("ApimSimulationClient = HttpApimSimulationClient [{}] (appels APIM réels)", reason);
            }
            this.currentMockMode = mockMode;
        }
    }

    @Override
    public Optional<LoanCalculateResponse> callLoanApi(String sourceCode, long amount, long duration,
                                                       String scaleCode, String effectiveOrigin)
            throws ApimException, IOException {
        return requireDelegate().callLoanApi(sourceCode, amount, duration, scaleCode, effectiveOrigin);
    }

    @Override
    public Optional<RevolvingCalculateResponse> callRevolvingApi(String sourceCode, long amount, long duration,
                                                                 String effectiveOrigin)
            throws ApimException, IOException {
        return requireDelegate().callRevolvingApi(sourceCode, amount, duration, effectiveOrigin);
    }

    @Override
    public Optional<CampaignResponse> callCampaignApi(String sourceCode, String product,
                                                      String effectiveOrigin)
            throws ApimException, IOException {
        return requireDelegate().callCampaignApi(sourceCode, product, effectiveOrigin);
    }

    private ApimSimulationClient requireDelegate() {
        ApimSimulationClient d = this.delegate.get();
        if (d == null) {
            throw new IllegalStateException(
                    "ApimSimulationClientFactory désactivé — aucun delegate disponible");
        }
        return d;
    }
}
