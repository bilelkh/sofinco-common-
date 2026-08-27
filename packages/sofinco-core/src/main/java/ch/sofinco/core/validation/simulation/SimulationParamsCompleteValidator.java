package ch.sofinco.core.validation.simulation;

import ch.sofinco.core.model.representativeexample.SimulationParams;
import ch.sofinco.core.util.JcrReads;
import org.jahia.services.content.JCRNodeWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.RepositoryException;
import javax.validation.ConstraintValidator;
import javax.validation.ConstraintValidatorContext;

/**
 * Exige que l'option « Simulation (exemple représentatif) » soit renseignée quand elle est activée.
 *
 * <h2>Pourquoi un validateur plutôt qu'un {@code mandatory} au CND</h2>
 * <p>Un {@code mandatory} est incontournable, y compris pour un script de reprise : c'est ce qui
 * nous a fait l'écarter au CND. Le validateur donne la même garantie tout en restant neutralisable
 * par {@code session.setSkipValidation(true)}, et il rend surtout un message ACTIONNABLE — un
 * contributeur doit savoir quel champ ouvrir, pas seulement qu'une contrainte a échoué.
 *
 * <h2>Ce qu'il corrige concrètement</h2>
 * <p>{@code simSourceId} est requis par l'APIM. Sans lui, le bridge renvoie {@code null} et le
 * panneau d'audit annonce « la simulation n'a renvoyé aucune donnée — service indisponible ». Le
 * diagnostic est FAUX et envoie chercher au mauvais endroit : la cause est un champ vide, à deux
 * clics de là. Le validateur supprime le cas au lieu d'améliorer le message.
 *
 * <p>{@code simProduct} détermine des chiffres réglementés (TAEG, mensualités, TAEA). Il n'a
 * volontairement aucun défaut au CND — un défaut serait faux la plupart du temps, de façon
 * invisible. Exiger une saisie explicite est la contrepartie de cette absence de défaut.
 *
 * <h2>Ce que ce validateur ne garantit PAS</h2>
 * <p>Il ne garde que les écritures validées — en pratique jContent. Les imports XML, les scripts
 * Groovy et le contenu publié depuis une version antérieure peuvent toujours produire une page au
 * mixin incomplet. <b>Le traitement défensif au rendu doit donc rester en place</b> : l'état
 * {@code incomplete} de {@code readSimulationParamsState}, le motif d'audit {@code no-product}, et
 * la notice de la vue serveur de l'exemple représentatif. Ce validateur est une première ligne, pas
 * un remplacement.
 */
public class SimulationParamsCompleteValidator
        implements ConstraintValidator<SimulationParamsComplete, SimulationParamsNodeValidator> {

    private static final Logger logger =
            LoggerFactory.getLogger(SimulationParamsCompleteValidator.class);

    static final String MESSAGE_PRODUCT =
            "Type de crédit obligatoire dès lors que l'option Simulation est activée";

    static final String MESSAGE_SOURCE_ID =
            "Source ID obligatoire dès lors que l'option Simulation est activée";

    /**
     * Message affiché au contributeur quand l'APIM refuse la provenance.
     *
     * <p>Il nomme la cause LA PLUS PROBABLE — une saisie erronée — sans exclure l'autre. L'API
     * répondant 500 aussi bien pour une provenance inexistante que pour une défaillance, affirmer
     * « n'existe pas » sans reserve enverrait un contributeur corriger un code juste pendant un
     * incident. La seconde phrase lui donne le geste à faire dans les deux cas.
     */
    static final String MESSAGE_UNKNOWN_SOURCE =
            "La campagne saisie n'existe pas : le simulateur ne la reconnaît pas. "
            + "Vérifiez le code auprès de l'équipe marketing, ou réessayez si le service est "
            + "momentanément indisponible.";

    @Override
    public void initialize(SimulationParamsComplete constraintAnnotation) {
        // rien à initialiser
    }

    @Override
    public boolean isValid(SimulationParamsNodeValidator holder, ConstraintValidatorContext ctx) {
        if (holder == null || holder.getNode() == null) {
            return true;
        }
        final JCRNodeWrapper page = holder.getNode();

        try {
            // Option non activée : rien à exiger. C'est le cas de l'immense majorité des pages,
            // et il se règle sur une seule lecture du registre de types.
            if (!page.isNodeType(SimulationParams.MIXIN)) {
                return true;
            }
        } catch (RepositoryException | RuntimeException e) {
            // Registre indisponible : on ne bloque jamais une sauvegarde sur un doute.
            logger.warn("Controle de la simulation impossible sur {}", path(page), e);
            return true;
        }

        final ViolationSink sink = new ViolationSink(ctx);
        final String product = JcrReads.readString(page, SimulationParams.PROP_PRODUCT);
        final String sourceId = JcrReads.readString(page, SimulationParams.PROP_SOURCE_ID);

        if (product == null) {
            sink.reject(SimulationParams.PROP_PRODUCT, MESSAGE_PRODUCT);
        }
        if (sourceId == null) {
            sink.reject(SimulationParams.PROP_SOURCE_ID, MESSAGE_SOURCE_ID);
        }

        // Un champ manquant se corrige avant tout appel reseau : inutile d'interroger l'APIM pour
        // une saisie que le contributeur doit de toute facon completer.
        if (sourceId != null) {
            checkAgainstCampaign(page, product, sourceId, sink);
        }
        return sink.isValid();
    }

    /**
     * Confronte la saisie a l'enveloppe reelle de l'offre.
     *
     * <p><b>Jamais de refus sur un doute.</b> Seuls deux verdicts bloquent : une provenance que
     * l'APIM declare inexistante, et une valeur que la campagne obtenue contredit. Panne, mode
     * mock, service absent - tout le reste laisse passer. Un controle qui empeche de sauvegarder
     * pendant un incident coute plus qu'il ne rapporte.
     */
    private static void checkAgainstCampaign(JCRNodeWrapper page, String product,
                                             String sourceId, ViolationSink sink) {
        CampaignLookup lookup = CampaignLookup.forSource(sourceId);

        if (lookup.status() == CampaignLookup.Status.UNKNOWN_SOURCE) {
            sink.reject(SimulationParams.PROP_SOURCE_ID, MESSAGE_UNKNOWN_SOURCE);
            return;
        }
        if (lookup.status() != CampaignLookup.Status.FOUND) {
            return;
        }

        for (CampaignConsistency.Violation violation : CampaignConsistency.check(
                product,
                JcrReads.readLong(page, SimulationParams.PROP_AMOUNT),
                JcrReads.readLong(page, SimulationParams.PROP_DURATION),
                lookup.campaign())) {
            sink.reject(violation.property(), violation.message());
        }
    }

    private static String path(JCRNodeWrapper node) {
        try {
            return node.getPath();
        } catch (Exception e) {
            return "?";
        }
    }

    /**
     * Collecte les violations en désactivant la contrainte par défaut une seule fois
     * (Bean Validation) et en mémorisant l'état global de validité. Même mécanique que le
     * contrôle de poids des images — les deux champs peuvent être signalés d'un seul save.
     */
    private static final class ViolationSink {
        private final ConstraintValidatorContext ctx;
        private boolean defaultDisabled;
        private boolean valid = true;

        ViolationSink(ConstraintValidatorContext ctx) {
            this.ctx = ctx;
        }

        void reject(String propertyName, String message) {
            if (!defaultDisabled) {
                ctx.disableDefaultConstraintViolation();
                defaultDisabled = true;
            }
            valid = false;
            ctx.buildConstraintViolationWithTemplate(message)
                    .addPropertyNode(propertyName)
                    .addConstraintViolation();
        }

        boolean isValid() {
            return valid;
        }
    }
}
