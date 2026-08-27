package ch.sofinco.core.service;

import ch.sofinco.core.client.http.HttpClientFactory;
import ch.sofinco.core.config.ApimConfig;
import ch.sofinco.core.exception.ApimException;
import org.apache.commons.lang3.StringUtils;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Deactivate;
import org.osgi.service.component.annotations.Modified;
import org.osgi.service.component.annotations.ServiceScope;
import org.osgi.service.metatype.annotations.Designate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicReference;


/**
 * Implémentation OSGi de {@link ApimService}.
 *
 * <p>Sécurité : {@code apimClientKey} et {@code accessToken} jamais loggués ; bodies HTTP
 * d'erreur sanitisés via {@link LogSanitizer} ; URLs HTTP non-loopback refusées au runtime
 * pour ne pas exposer Basic/Bearer en clair (fail-closed via {@link SecurityChecks}).
 *
 * <p>Concurrence : {@code @Modified} invalide le cache token AVANT d'appliquer la nouvelle
 * config sous {@code cacheLock} ; le refresh tient le verrou pour empêcher un token stampede.
 *
 * <p>Le {@link CloseableHttpClient} est <b>unique et partagé</b> pour les appels token et les
 * appels API (cf. {@link HttpClientFactory}) — pool / TLS / DNS mutualisés.
 *
 * <p>⚠ Le {@code configurationPid} reste {@code ch.sofinco.core.apim} (inchangé malgré le
 * déplacement de {@code ApimConfig} dans le package {@code config}) pour ne pas orphaniner les
 * configurations OSGi déployées.
 */
@Component(
        service = ApimService.class,
        immediate = true,
        scope = ServiceScope.SINGLETON,
        configurationPid = "ch.sofinco.core.apim"
)
@Designate(ocd = ApimConfig.class)
public class ApimServiceImpl implements ApimService {

    private static final Logger LOG = LoggerFactory.getLogger(ApimServiceImpl.class);

    private static final String DEFAULT_PARTNER_ID = "web_sofinco";

    private final Object httpClientLock = new Object();

    /** Négociation et mise en cache du jeton OAuth — voir {@link ApimTokenStore}. */
    private final ApimTokenStore tokenStore = new ApimTokenStore();

    private final AtomicReference<ApimConfig> config = new AtomicReference<>();
    private final AtomicReference<CloseableHttpClient> sharedHttpClient = new AtomicReference<>();

    /** Constructeur OSGi. */
    public ApimServiceImpl() {
        // câblage via @Activate / @Modified
    }

    /** Seam de test : injection directe sans simuler le cycle DS. Package-private. */
    ApimServiceImpl(ApimConfig config, CloseableHttpClient sharedHttpClient) {
        this.config.set(config);
        this.sharedHttpClient.set(sharedHttpClient);
    }

    @Activate
    public void activate(ApimConfig newConfig) {
        tokenStore.reconfigure(() -> applyConfig(newConfig, "activate"));
        rebuildHttpClient(newConfig);
    }

    @Modified
    public void modified(ApimConfig newConfig) {
        tokenStore.reconfigure(() -> applyConfig(newConfig, "modified"));
        rebuildHttpClient(newConfig);
        LOG.info("ApimService reconfiguré, cache token invalidé, HttpClient recréé");
    }

    @Deactivate
    public void deactivate() {
        tokenStore.reconfigure(() -> this.config.set(null));
        synchronized (httpClientLock) {
            closeHttpClient();
        }
        LOG.info("ApimService désactivé");
    }

    private void applyConfig(ApimConfig newConfig, String origin) {
        this.config.set(newConfig);
        if (!ApimConfigs.hasMandatoryFields(newConfig)) {
            LOG.warn("ApimService [{}] : configuration incomplète (apimApiUrl ou apimClientKey absent).", origin);
            return;
        }
        ApimConfigs.warnIfWhitespaceInConfig(newConfig, origin);
        if (!newConfig.mockMode()) {
            ApimConfigs.validateHttpsForProduction(newConfig);
        }
        LOG.info("ApimService [{}] : apiUrl={}, partnerId={}, origin={}, mockMode={}",
                origin, newConfig.apimApiUrl(),
                newConfig.partnerId(), newConfig.apimOrigin(), newConfig.mockMode());
    }

    private void rebuildHttpClient(ApimConfig cfg) {
        synchronized (httpClientLock) {
            closeHttpClient();
            if (cfg != null) {
                this.sharedHttpClient.set(HttpClientFactory.build(
                        cfg.connectTimeoutSeconds(),
                        cfg.socketTimeoutSeconds(),
                        cfg.responseTimeoutSeconds()));
            }
        }
    }

    private void closeHttpClient() {
        CloseableHttpClient old = this.sharedHttpClient.getAndSet(null);
        if (old != null) {
            try {
                old.close(); // GRACEFUL : laisse les requêtes actives se terminer.
            } catch (IOException e) {
                LOG.debug("Echec fermeture HttpClient (ignoré) : {}", e.getMessage());
            }
        }
    }

    @Override public boolean isConfigured()       { return ApimConfigs.hasMandatoryFields(this.config.get()); }
    @Override public boolean isMockMode()         { ApimConfig c = this.config.get(); return c != null && c.mockMode(); }
    @Override public CloseableHttpClient getHttpClient() { return this.sharedHttpClient.get(); }
    @Override public String getPartnerId()        {
        ApimConfig c = this.config.get();
        if (c == null) return DEFAULT_PARTNER_ID;
        var cleaned = ApimConfigs.cleanConfigString(c.partnerId());
        return cleaned.isEmpty() ? DEFAULT_PARTNER_ID : cleaned;
    }
    @Override public String getApiUrl()           {
        ApimConfig c = this.config.get();
        if (c == null) return "";
        return StringUtils.removeEnd(ApimConfigs.cleanConfigString(c.apimApiUrl()), "/");
    }
    @Override public String getOrigin()           {
        ApimConfig c = this.config.get();
        return c != null ? ApimConfigs.cleanConfigString(c.apimOrigin()) : "";
    }
    @Override public int getConnectTimeoutSeconds()  { ApimConfig c = this.config.get(); return c != null ? c.connectTimeoutSeconds()  : 5;  }
    @Override public int getSocketTimeoutSeconds()   { ApimConfig c = this.config.get(); return c != null ? c.socketTimeoutSeconds()   : 10; }
    @Override public int getResponseTimeoutSeconds() { ApimConfig c = this.config.get(); return c != null ? c.responseTimeoutSeconds() : 15; }

    @Override
    public void invalidateCache() {
        tokenStore.invalidate();
    }

    @Override
    public String getAccessToken() throws ApimException {
        return tokenStore.getAccessToken(this.config.get(), this.sharedHttpClient.get());
    }
}
