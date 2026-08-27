package ch.sofinco.core.bridge;

import ch.sofinco.core.mapper.CampaignMapper;
import ch.sofinco.core.model.representativeexample.CampaignParams;
import ch.sofinco.core.model.representativeexample.SimulationParams;
import ch.sofinco.core.observability.CorrelationIdContext;
import ch.sofinco.core.service.CampaignService;
import ch.sofinco.core.util.JcrReads;
import org.jahia.services.content.JCRNodeWrapper;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.osgi.service.component.annotations.ReferencePolicyOption;
import org.osgi.service.component.annotations.ServiceScope;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Implémentation de {@link CampaignBridge}.
 *
 * <p>Point d'entrée depuis le moteur JavaScript : ouvre un scope MDC {@code correlationId} pour que
 * les journaux du service et du client portent le même identifiant, puis délègue.
 *
 * <p><b>Aucune RuntimeException ne doit remonter.</b> Le moteur
 * {@code javascript-modules-engine} cascade sinon en « bodyEndTag is null », qui casse la page
 * entière et non le seul fragment fautif.
 */
@Component(
        service = CampaignBridge.class,
        immediate = true,
        scope = ServiceScope.SINGLETON,
        property = "service.description=Bridge OSGi des variables de campagne, consommé par sofinco-template"
)
public class CampaignBridgeImpl implements CampaignBridge {

    private static final Logger LOG = LoggerFactory.getLogger(CampaignBridgeImpl.class);

    @Reference
    private CampaignService campaignService;

    /**
     * Fournisseur d'{@code Origin} : optionnel, car le service retombe sur l'origine configurée
     * quand la requête n'en porte pas.
     */
    @SuppressWarnings("java:S3077")
    @Reference(
            cardinality = ReferenceCardinality.OPTIONAL,
            policyOption = ReferencePolicyOption.GREEDY
    )
    private volatile RequestOriginProvider originProvider;

    /** Constructeur OSGi. */
    public CampaignBridgeImpl() {
        // câblage DS
    }

    /** Seam de test : injecte le service et le fournisseur d'Origin. */
    CampaignBridgeImpl(CampaignService campaignService, RequestOriginProvider originProvider) {
        this.campaignService = campaignService;
        this.originProvider = originProvider;
    }

    @Activate
    public void activate() {
        LOG.info("CampaignBridge activé");
    }

    @Override
    public Map<String, Object> getCampaignVars(JCRNodeWrapper node) {
        try (CorrelationIdContext.Scope ignored = CorrelationIdContext.open()) {
            if (node == null) {
                LOG.warn("getCampaignVars(null) — nœud absent, campagne non résolue");
                return null;
            }

            JCRNodeWrapper page = SimulationParams.findPage(node);
            CampaignParams params = CampaignParams.read(page);
            if (params == null) {
                // Page sans mixin ou sans provenance : rien à interroger. L'audit le signale en
                // édition, ce n'est pas une erreur ici.
                return null;
            }

            // Snapshot du volatile pour éviter une race read/use sur unbind DS.
            RequestOriginProvider provider = this.originProvider;
            String requestOrigin = provider != null ? provider.currentOrigin() : null;

            /*
             * Le produit de la page sert d'INDICATION DE ROUTAGE APIM, pas de précondition : les
             * variables de campagne restent disponibles sans lui. `JcrReads` renvoie null quand la
             * propriété est absente, et le client retombe alors sur la racine qui sert toutes les
             * campagnes — la page garde donc ses bornes d'offre même sans type de crédit.
             */
            String product = JcrReads.readString(page, SimulationParams.PROP_PRODUCT);

            return campaignService.getCampaign(params.sourceId(), product, requestOrigin)
                    .map(CampaignMapper::toVars)
                    .map(CampaignBridgeImpl::toJavaScriptMap)
                    .orElse(null);
        } catch (RuntimeException e) {
            LOG.error("Erreur inattendue campagne : {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Recopie dans une {@code LinkedHashMap<String, Object>}.
     *
     * <p>Le moteur GraalVM lit les {@code Map} du côté JavaScript ; une carte de {@code String} y
     * passe telle quelle, mais le type déclaré doit être {@code Object} pour rester aligné sur le
     * contrat du pont — et pour qu'une valeur non textuelle ajoutée demain ne casse pas la
     * signature.
     */
    private static Map<String, Object> toJavaScriptMap(Map<String, String> vars) {
        return vars.isEmpty() ? null : new LinkedHashMap<>(vars);
    }
}
