package ch.sofinco.core.cache;

/**
 * Verrous striés — un seul appel APIM en vol par configuration.
 *
 * <p><b>Le problème.</b> Après une purge de cache ou un déploiement, plusieurs pages partageant la
 * même configuration se re-rendent en même temps. Une fenêtre de fraîcheur seule ne les rattrape
 * pas : elles manquent toutes le cache avant que la première réponse ne l'alimente. Le verrou
 * effondre la rafale en un appel — sans introduire le moindre décalage, puisque le résultat servi
 * vient d'un appel qui vient d'aboutir.
 *
 * <p><b>Pourquoi strié plutôt qu'un verrou par clé.</b> Une {@code Map<Key, Object>} de verrous
 * croîtrait sans borne et demanderait un nettoyage. Un tableau de taille fixe n'a ni fuite ni
 * cycle de vie. Le prix est la collision : deux configurations distinctes tombant sur la même
 * bande se sérialisent. À une cardinalité de quelques dizaines de configurations, c'est rare, et
 * l'attente vaut un appel APIM — sans commune mesure avec les appels dupliqués évités.
 *
 * <p><b>Ce qu'il ne faut surtout pas faire à la place.</b> {@code ConcurrentHashMap.computeIfAbsent}
 * avec l'appel réseau dans la fonction de mapping : le bin reste verrouillé pendant tout l'appel,
 * timeout compris, et bloque les threads calculant d'autres clés du même bin.
 */
public final class KeyedLocks {

    private final Object[] stripes;

    public KeyedLocks(int stripeCount) {
        this.stripes = new Object[stripeCount];
        for (var i = 0; i < stripeCount; i++) {
            stripes[i] = new Object();
        }
    }

    /** Moniteur associé à une clé. Stable pour une clé donnée, sur toute la vie de l'instance. */
    public Object forKey(Object key) {
        int hash = key == null ? 0 : key.hashCode();
        return stripes[Math.floorMod(hash, stripes.length)];
    }

    /** Visible pour tests. */
    public int stripeCount() {
        return stripes.length;
    }
}
