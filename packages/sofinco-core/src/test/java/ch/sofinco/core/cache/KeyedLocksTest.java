package ch.sofinco.core.cache;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/** Contrat du verrou strié : stabilité par clé, égalité plutôt qu'identité, répartition. */
class KeyedLocksTest {

    @Test
    void sameKey_alwaysYieldsTheSameMonitor() {
        KeyedLocks locks = new KeyedLocks(16);

        assertThat(locks.forKey("PB-15000-48")).isSameAs(locks.forKey("PB-15000-48"));
    }

    /** Deux clés ÉGALES doivent partager le moniteur, sinon deux appels identiques partiraient. */
    @Test
    void equalButDistinctKeys_shareTheMonitor() {
        KeyedLocks locks = new KeyedLocks(16);

        assertThat(locks.forKey(new String("PB-15000-48")))
                .isSameAs(locks.forKey(new String("PB-15000-48")));
    }

    /** {@code hashCode} négatif : {@code %} donnerait un index négatif, d'où {@code floorMod}. */
    @Test
    void negativeHashCode_staysInBounds() {
        KeyedLocks locks = new KeyedLocks(16);

        assertThat(locks.forKey(new Object() {
            @Override
            public int hashCode() {
                return Integer.MIN_VALUE;
            }
        })).isNotNull();
    }

    @Test
    void nullKey_isHandled() {
        assertThat(new KeyedLocks(16).forKey(null)).isNotNull();
    }

    /** Une seule bande annulerait tout parallélisme entre configurations distinctes. */
    @Test
    void distinctKeys_spreadAcrossStripes() {
        KeyedLocks locks = new KeyedLocks(16);

        Set<Object> monitors = new HashSet<>();
        IntStream.range(0, 200).forEach(i -> monitors.add(locks.forKey("config-" + i)));

        assertThat(monitors).hasSize(16);
        assertThat(locks.stripeCount()).isEqualTo(16);
    }
}
