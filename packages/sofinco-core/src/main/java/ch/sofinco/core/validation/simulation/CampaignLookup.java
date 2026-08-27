package ch.sofinco.core.validation.simulation;

import ch.sofinco.core.client.ApimSimulationClient;
import ch.sofinco.core.exception.ApimErrorKind;
import ch.sofinco.core.exception.ApimException;
import ch.sofinco.core.model.representativeexample.CampaignResponse;
import ch.sofinco.core.service.ApimService;
import org.osgi.framework.FrameworkUtil;
import org.osgi.framework.ServiceReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.Clock;

/**
 * Interroge l'APIM pour le compte du contrôle de saisie, et traduit sa réponse en verdict.
 *
 * <h2>Trois verdicts, pas deux</h2>
 *
 * <p>Le rendu se contente de « j'ai une campagne ou je n'en ai pas ». Le contrôle de saisie, lui,
 * doit distinguer un TROISIÈME cas : « je ne sais pas ». Refuser une provenance inexistante rend
 * service au contributeur ; refuser une sauvegarde parce que l'APIM est tombé lui fait perdre son
 * travail sur un incident dont il n'est pas responsable.
 *
 * <h2>Pourquoi l'appel direct au client, sans passer par {@code CampaignService}</h2>
 *
 * <p>Le service met en cache pour trente minutes et sert une valeur de secours en cas de panne :
 * exactement ce qu'il faut au rendu, exactement ce qu'il ne faut pas ici. Un contributeur qui
 * corrige une provenance fautive doit être jugé sur la réponse du moment, pas sur une entrée
 * mémorisée avant sa correction — ni sauvé par un secours qui masquerait une provenance devenue
 * invalide.
 *
 * <p>Conséquence assumée : une sauvegarde de page portant le mixin déclenche un appel APIM. Les
 * sauvegardes sont rares au regard des rendus, et c'est le prix du contrôle lui-même.
 */
final class CampaignLookup {

    private static final Logger logger = LoggerFactory.getLogger(CampaignLookup.class);

    /**
     * Verdicts recemment rendus, partages par toutes les validations de cette JVM.
     *
     * <p>Statique parce qu'un {@code ConstraintValidator} est instancie par le moteur de
     * validation, potentiellement une fois par sauvegarde : porter le cache sur l'instance
     * reviendrait a ne rien mettre en cache du tout.
     */
    private static final CampaignVerdictCache VERDICTS = new CampaignVerdictCache(Clock.systemUTC());

    /** Verdict rendu au validateur. */
    enum Status {
        /** Campagne obtenue : les comparaisons de champs sont possibles. */
        FOUND,
        /**
         * L'APIM affirme que cette provenance n'existe pas — HTTP 404, ou le 500 que cet
         * endpoint herite renvoie a sa place. Refus legitime.
         */
        UNKNOWN_SOURCE,
        /** Panne, mode mock, service absent : on ne sait pas, donc on ne bloque rien. */
        UNAVAILABLE
    }

    private final Status status;
    private final CampaignResponse campaign;

    private CampaignLookup(Status status, CampaignResponse campaign) {
        this.status = status;
        this.campaign = campaign;
    }

    /** Fabriques nommees — plus lisibles qu'un constructeur prive a deux arguments. */
    static CampaignLookup forFound(CampaignResponse campaign) {
        return new CampaignLookup(Status.FOUND, campaign);
    }

    static CampaignLookup forUnknownSource() {
        return new CampaignLookup(Status.UNKNOWN_SOURCE, null);
    }

    static CampaignLookup forUnavailable() {
        return new CampaignLookup(Status.UNAVAILABLE, null);
    }

    Status status() {
        return status;
    }

    CampaignResponse campaign() {
        return campaign;
    }

    /**
     * Interroge l'APIM.
     *
     * <p><b>Produit volontairement {@code null}</b> : il ne sert qu'à choisir la racine APIM, et
     * ce contrôle interroge justement la campagne pour VÉRIFIER le produit saisi. Le lui passer
     * ferait router sur la foi de la valeur suspectée. La racine par défaut sert de toute façon
     * toutes les campagnes.
     *
     * <p>Seuls 404 et 500 valent « provenance inexistante ». TOUTE autre anomalie produit
     * {@link Status#UNAVAILABLE} et ne bloque donc aucune saisie — 401 (identifiants APIM
     * expires), 403, 502, 503, registre OSGi
     * indisponible, mode mock, APIM non configuré, panne réseau, réponse vide. Le doute ne bloque
     * jamais une sauvegarde.
     */
    static CampaignLookup forSource(String sourceId) {
        return forSource(service(ApimService.class), service(ApimSimulationClient.class), sourceId);
    }

    /**
     * Traduction d'une reponse APIM en verdict — separee de la resolution OSGi pour etre eprouvee.
     *
     * <p>C'est ici que vit la regle qui compte : quels cas bloquent une sauvegarde et quels cas la
     * laissent passer. La resolution au registre, elle, n'a rien a decider.
     */
    static CampaignLookup forSource(ApimService apim, ApimSimulationClient client, String sourceId) {
        if (apim == null || client == null) {
            return unavailable("services APIM non resolus");
        }

        CampaignLookup memorized = VERDICTS.get(sourceId);
        if (memorized != null) {
            return memorized;
        }

        try {
            // En mock, les campagnes sont des fixtures : elles ne disent rien de la validité d'une
            // provenance réelle, et les comparer refuserait des saisies parfaitement correctes.
            if (apim.isMockMode() || !apim.isReady()) {
                return unavailable("APIM en mock ou non configuré");
            }
            return remember(sourceId, client.callCampaignApi(sourceId, null, apim.getOrigin())
                    .map(CampaignLookup::forFound)
                    .orElseGet(() -> unavailable("réponse APIM vide")));
        } catch (ApimException e) {
            /*
             * L'APIM a REPONDU, et sa reponse n'etait pas un succes : verdict definitif.
             *
             * Cet endpoint herite renvoie 500 la ou un 404 serait attendu (verifie en production
             * sur `NEOURL028555`). On ne peut donc pas separer « provenance inexistante » de
             * « defaillance serveur », et l'API ne sera pas corrigee pour cette refonte.
             *
             * Le parti pris : une reponse HTTP negative fait refuser la saisie. Le cas courant
             * — un code mal saisi — est ainsi rattrape au moment ou le contributeur peut agir.
             */
            if (e.kind() == ApimErrorKind.RESOURCE_NOT_FOUND) {
                return remember(sourceId, forUnknownSource());
            }
            return unavailable(e.getMessage());
        } catch (IOException e) {
            // AUCUNE réponse HTTP : coupure réseau, délai dépassé, passerelle injoignable. C'est
            // la forme la plus fréquente d'indisponibilité, et la seule qui ne bloque rien.
            return unavailable(e.getMessage());
        } catch (RuntimeException e) {
            // Défaillance inattendue : elle ne doit pas empêcher une sauvegarde non plus.
            logger.warn("Contrôle de campagne interrompu : {}", e.getMessage(), e);
            return unavailable(e.getMessage());
        }
    }

    /**
     * Memorise un verdict DEFINITIF avant de le rendre.
     *
     * <p>Un {@code UNAVAILABLE} traverse sans etre retenu : le cache l'ignore de lui-meme, pour
     * qu'un APIM revenu en ligne soit reinterroge immediatement.
     */
    private static CampaignLookup remember(String sourceId, CampaignLookup verdict) {
        VERDICTS.put(sourceId, verdict);
        return verdict;
    }

    /** Vide les verdicts memorises — reservee aux tests. */
    static void clearCache() {
        VERDICTS.clear();
    }

    private static CampaignLookup unavailable(String reason) {
        logger.debug("Contrôle de campagne non concluant ({}) — saisie acceptée", reason);
        return new CampaignLookup(Status.UNAVAILABLE, null);
    }

    /**
     * Résolution OSGi. Un validateur Bean Validation est instancié par le moteur de validation, pas
     * par DS : aucune référence ne peut y être injectée, d'où cette recherche au registre.
     */
    private static <T> T service(Class<T> type) {
        try {
            var bundle = FrameworkUtil.getBundle(CampaignLookup.class);
            if (bundle == null || bundle.getBundleContext() == null) {
                // Hors conteneur OSGi — tests unitaires en JVM nue.
                return null;
            }
            ServiceReference<T> ref = bundle.getBundleContext().getServiceReference(type);
            return ref != null ? bundle.getBundleContext().getService(ref) : null;
        } catch (RuntimeException e) {
            logger.debug("Résolution du service {} échouée : {}", type.getSimpleName(), e.getMessage());
            return null;
        }
    }
}
