package ch.sofinco.core.bridge;

/**
 * Fournit l'Origin (schéma + host [+ port]) du request HTTP courant.
 *
 * <p>Seam d'isolation du couplage au thread-local Spring {@code RequestContextHolder} : le bridge
 * dépend de cette interface (mockable en test) plutôt que de l'état ambiant.
 */
public interface RequestOriginProvider {

    /** @return l'Origin courant (ex. {@code "https://www.sofinco.fr"}), ou {@code null} hors contexte HTTP. */
    String currentOrigin();
}
