package ch.sofinco.core.exception;

import java.io.Serial;

/**
 * Exception métier levée par {@code ApimService} et la chaîne d'appel APIM.
 *
 * <p>Non-runtime intentionnellement : les appelants doivent décider explicitement comment réagir
 * (composant invisible, fallback mock, log et continue, etc.) plutôt que de propager
 * silencieusement une RuntimeException jusqu'au rendu Jahia.
 *
 * <h2>Typage par {@link ApimErrorKind}</h2>
 *
 * <p>Depuis la révision audit, l'exception porte un {@link ApimErrorKind} optionnel décrivant la
 * catégorie de l'échec (config absente, refus HTTPS, parse, échec réseau, etc.). Les appelants
 * peuvent brancher proprement dessus au lieu de parser le message string :
 *
 * <pre>{@code
 * try {
 *     apim.getAccessToken();
 * } catch (ApimException e) {
 *     if (e.kind() == ApimErrorKind.CONFIG_MISSING) {
 *         // court-circuit silencieux : config OSGi non encore posée
 *     } else if (e.kind() == ApimErrorKind.TOKEN_FETCH_FAILED) {
 *         metrics.tokenFailure().increment();
 *     }
 * }
 * }</pre>
 *
 * <p>Les constructeurs sans {@link ApimErrorKind} sont conservés pour rétro-compatibilité et
 * positionnent {@link ApimErrorKind#UNSPECIFIED}.
 */
public class ApimException extends Exception {

    @Serial
    private static final long serialVersionUID = 2L;

    private final ApimErrorKind kind;

    public ApimException(String message) {
        this(ApimErrorKind.UNSPECIFIED, message, null);
    }

    public ApimException(String message, Throwable cause) {
        this(ApimErrorKind.UNSPECIFIED, message, cause);
    }

    public ApimException(ApimErrorKind kind, String message) {
        this(kind, message, null);
    }

    public ApimException(ApimErrorKind kind, String message, Throwable cause) {
        super(message, cause);
        this.kind = kind != null ? kind : ApimErrorKind.UNSPECIFIED;
    }

    /**
     * Catégorie de l'échec. Jamais {@code null} ; vaut {@link ApimErrorKind#UNSPECIFIED} si le
     * site d'émission n'a pas précisé de catégorie (rétro-compatibilité des constructeurs
     * legacy).
     */
    public ApimErrorKind kind() {
        return kind;
    }
}
