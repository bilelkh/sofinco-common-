package ch.sofinco.core.model.apim;

import java.time.Duration;
import java.time.Instant;

/**
 * Wrapper d'un access token UUID avec sa deadline de cache calculée.
 *
 * <p>{@code deadline = obtainedAt + sanitizedExpiresIn - safetyMargin}. Au-delà de cette
 * deadline le token est considéré expiré côté cache.
 *
 * <p>⚠ {@code sanitizedExpiresIn} doit déjà être plafonné/planché AVANT d'arriver ici
 * (cf. {@code ApimServiceImpl.sanitizeExpiresIn()}). Immuable et thread-safe.
 */
public record CachedToken(String accessToken, Instant obtainedAt, Instant deadline) {

    /**
     * Construit un CachedToken à partir d'un token UUID, de la date d'obtention, d'une durée de
     * vie déjà sanitisée et de la marge de sécurité. La deadline est garantie au moins 1 seconde
     * dans le futur (planché si la marge dépasse la durée).
     */
    public static CachedToken from(String accessToken, Instant obtainedAt,
                                   long sanitizedExpiresInSeconds, int safetyMarginSeconds) {
        long effectiveTtl = Math.max(1L, sanitizedExpiresInSeconds - safetyMarginSeconds);
        return new CachedToken(accessToken, obtainedAt, obtainedAt.plusSeconds(effectiveTtl));
    }

    public boolean isStillValid(Instant now) {
        return now.isBefore(deadline);
    }

    public long remainingSecondsAt(Instant now) {
        return isStillValid(now) ? Duration.between(now, deadline).getSeconds() : 0L;
    }
}
