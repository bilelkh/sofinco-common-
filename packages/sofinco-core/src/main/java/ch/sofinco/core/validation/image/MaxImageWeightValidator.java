package ch.sofinco.core.validation.image;

import java.util.ArrayList;
import java.util.List;

import javax.jcr.PropertyIterator;
import javax.jcr.PropertyType;
import javax.jcr.RepositoryException;
import javax.jcr.Value;
import javax.validation.ConstraintValidator;
import javax.validation.ConstraintValidatorContext;

import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapper;
import org.jahia.services.content.JCRSessionWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Contrôle le poids des images référencées par un contenu, au save (Content Editor).
 *
 * <p>Couvre les propriétés reference/weakreference <b>mono- ET multi-valuées</b> ; chaque cible
 * est retenue si c'est un fichier IMAGE (MIME {@code image/*} — PNG/JPEG/WebP/GIF/AVIF ET SVG).</p>
 *
 * <p>Cette classe ne fait que <b>parcourir</b> le contenu, résoudre les images et émettre les
 * violations. Le choix de la limite par champ (défauts + overlay de la config
 * {@code sofnt:imageWeightPolicy}) est délégué à {@link ImageWeightPolicy}.</p>
 */
public class MaxImageWeightValidator
        implements ConstraintValidator<MaxImageWeight, ImageWeightNodeValidator> {

    private static final Logger LOGGER = LoggerFactory.getLogger(MaxImageWeightValidator.class);

    @Override
    public void initialize(MaxImageWeight constraintAnnotation) {
        // rien à initialiser
    }

    @Override
    public boolean isValid(ImageWeightNodeValidator holder, ConstraintValidatorContext ctx) {
        if (holder == null || holder.getNode() == null) {
            return true;
        }
        final JCRNodeWrapper node = holder.getNode();
        final var sink = new ViolationSink(ctx);
        try {
            // Sauvegarde de la config elle-même : on évince le cache du site (fraîcheur immédiate)
            // et on sort — un noeud policy/règle ne porte aucune image à contrôler.
            if (ImageWeightPolicy.isPolicyNode(node)) {
                ImageWeightPolicy.invalidate(node);
                return true;
            }

            ImageWeightPolicy policy = null; // chargée paresseusement au 1er champ image
            final PropertyIterator it = node.getProperties();
            while (it.hasNext()) {
                policy = checkProperty((JCRPropertyWrapper) it.nextProperty(), node, policy, sink);
            }
        } catch (RepositoryException | RuntimeException e) {
            LOGGER.warn("Contrôle du poids des images impossible sur {}", path(node), e);
            return true;
        }
        return sink.isValid();
    }

    /**
     * Contrôle une propriété du nœud, en chargeant la policy au premier champ image rencontré.
     *
     * @param policy policy déjà chargée, ou {@code null} tant qu'aucun champ image n'a été vu
     * @return la policy à réutiliser pour les propriétés suivantes ({@code null} si toujours
     *         inutile)
     */
    private ImageWeightPolicy checkProperty(JCRPropertyWrapper property, JCRNodeWrapper node,
            ImageWeightPolicy policy, ViolationSink sink) throws RepositoryException {
        if (!isReference(property)) {
            return policy;
        }
        final List<JCRNodeWrapper> images = resolveImages(property);
        if (images.isEmpty()) {
            return policy;
        }
        final ImageWeightPolicy effective = policy != null ? policy : ImageWeightPolicy.forNode(node);
        checkImages(property, images, effective, sink);
        return effective;
    }

    private static boolean isReference(JCRPropertyWrapper property) throws RepositoryException {
        final int type = property.getDefinition().getRequiredType();
        return type == PropertyType.WEAKREFERENCE || type == PropertyType.REFERENCE;
    }

    /** Contrôle chaque image de la propriété contre la limite de sa catégorie. */
    private void checkImages(JCRPropertyWrapper property, Iterable<JCRNodeWrapper> images,
            ImageWeightPolicy policy, ViolationSink sink) throws RepositoryException {
        // La catégorie dépend du nom de la propriété, pas de l'image : calculée une fois.
        final var rule = policy.pick(property.getName());
        for (JCRNodeWrapper image : images) {
            final long size = image.getFileContent().getContentLength();
            if (size > rule.maxBytes) {
                sink.reject(property.getName(), message(rule, size));
            }
        }
    }

    /**
     * Cibles IMAGE (mime {@code image/*}, SVG inclus) référencées par une propriété
     * reference/weakreference, qu'elle soit mono- ou multi-valuée. Les valeurs cassées
     * (cible supprimée, non-fichier ou non-image) sont ignorées silencieusement.
     */
    private List<JCRNodeWrapper> resolveImages(JCRPropertyWrapper property) {
        final List<JCRNodeWrapper> images = new ArrayList<>();
        try {
            final JCRSessionWrapper session = property.getSession();
            final Value[] values = property.isMultiple()
                    ? property.getValues()
                    : new Value[] { property.getValue() };
            for (Value reference : values) {
                final JCRNodeWrapper image = resolveImage(session, reference);
                if (image != null) {
                    images.add(image);
                }
            }
        } catch (RepositoryException e) {
            // propriété illisible -> ignorée (ne bloque jamais la sauvegarde)
        }
        return images;
    }

    /** Résout une valeur référence (UUID) en fichier image, ou null si non pertinent/cassé. */
    private JCRNodeWrapper resolveImage(JCRSessionWrapper session, Value reference) {
        try {
            final JCRNodeWrapper target = session.getNodeByIdentifier(reference.getString());
            if (!target.isNodeType("nt:file")) {
                return null;
            }
            final String mime = target.getFileContent().getContentType();
            return (mime != null && mime.startsWith("image/")) ? target : null;
        } catch (RepositoryException e) {
            return null; // référence cassée -> ignorée
        }
    }

    private String message(ImageWeightPolicy.Rule rule, long size) {
        final long sizeKo = Math.round(size / 1024.0);
        final long limitKo = Math.round(rule.maxBytes / 1024.0);
        return "Image trop lourde [" + rule.label + "] : " + sizeKo
                + " Ko, la limite autorisee est " + limitKo
                + " Ko. Merci de compresser l'image avant publication.";
    }

    private String path(JCRNodeWrapper n) {
        try {
            return n.getPath();
        } catch (Exception e) {
            return "?";
        }
    }

    /**
     * Collecte les violations en désactivant la contrainte par défaut une seule fois
     * (Bean Validation) et en mémorisant l'état global de validité.
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
