package ch.sofinco.core.cache;

import net.sf.ehcache.Cache;
import net.sf.ehcache.CacheManager;
import net.sf.ehcache.Ehcache;
import net.sf.ehcache.config.CacheConfiguration;
import net.sf.ehcache.config.Configuration;
import net.sf.ehcache.store.MemoryStoreEvictionPolicy;
import org.jahia.services.cache.CacheProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Obtient, configure et libère un magasin ehcache auprès de la plateforme Jahia.
 *
 * <p>Toute la connaissance des pièges ehcache — héritage du {@code defaultCache}, méthode par
 * défaut renvoyant {@code null}, collision de noms au redéploiement, réplicateur JGroups — tient
 * ici, en un seul exemplaire. C'est la raison d'être de cette classe : ces pièges se paient à
 * l'exécution, sur cluster uniquement pour certains, donc jamais en recette. Les dupliquer d'un
 * cache à l'autre garantit qu'une correction n'en atteindra qu'un.
 *
 * <p><b>Ne peut jamais faire échouer l'appelant.</b> Un cache est une optimisation : si la
 * plateforme ne coopère pas, on dégrade vers un gestionnaire privé plutôt que de priver la page
 * de son contenu.
 *
 * <p>Une instance par cache nommé — elle mémorise le gestionnaire réellement utilisé pour pouvoir
 * retirer le cache à l'arrêt du bundle.
 */
public final class EhcacheStoreFactory {

    private static final Logger LOG = LoggerFactory.getLogger(EhcacheStoreFactory.class);

    /** Gestionnaire de repli, quand celui de Jahia n'est pas joignable. */
    public static final String STANDALONE_MANAGER_NAME = "sofincoStandaloneCacheManager";

    /** Nom du cache — visible dans {@code /tools/cache.jsp}. */
    private final String cacheName;

    /** Fourni par les tests ; {@code null} en production. */
    private final CacheManager injectedManager;

    /** Gestionnaire réellement utilisé — mémorisé pour {@link #dispose()}. */
    private final AtomicReference<CacheManager> managerInUse = new AtomicReference<>();

    public EhcacheStoreFactory(String cacheName, CacheManager injectedManager) {
        this.cacheName = cacheName;
        this.injectedManager = injectedManager;
    }

    /** Nom du cache géré par cette instance. */
    public String cacheName() {
        return cacheName;
    }

    /**
     * Construit — ou reconfigure et vide — le magasin. Un appel ultérieur reconfigure le cache
     * existant plutôt que d'en créer un second.
     */
    public Ehcache store(CacheProvider provider, int maxEntries, Duration ttl) {
        try {
            return obtain(resolveManager(provider), maxEntries, ttl);
        } catch (RuntimeException e) {
            // Dernier filet : jamais d'échec d'activation pour un problème de cache.
            LOG.warn("Cache « {} » indisponible ({}) — repli sur un cache local.",
                    cacheName, e.getMessage());
            return obtain(standaloneManager(), maxEntries, ttl);
        }
    }

    /**
     * Retire le cache de son gestionnaire à l'arrêt du bundle.
     *
     * <p>Sans cela, un redéploiement laisserait un cache orphelin — inutile, compté dans les
     * statistiques, et portant des objets chargés par un classloader mort. Le gestionnaire, lui,
     * n'est jamais arrêté : celui de Jahia ne nous appartient pas, et le nôtre est retrouvé par son
     * nom au redéploiement.
     */
    public void dispose() {
        try {
            CacheManager manager = managerInUse.get();
            if (manager != null && manager.getEhcache(cacheName) != null) {
                manager.removeCache(cacheName);
            }
        } catch (RuntimeException e) {
            LOG.debug("Retrait du cache « {} » ignoré : {}", cacheName, e.getMessage());
        }
    }

    /**
     * Gestionnaire à utiliser, avec repli.
     *
     * <p>{@code getCacheManager()} peut légitimement renvoyer {@code null} — c'est le corps de la
     * méthode par défaut de l'interface, que seul {@code EhCacheProvider} surcharge.
     */
    private CacheManager resolveManager(CacheProvider provider) {
        if (injectedManager != null) {
            return injectedManager;
        }
        CacheManager manager = provider != null ? provider.getCacheManager() : null;
        if (manager != null) {
            return manager;
        }
        // Formulation vérifiée : `CacheHelper.flushAllCaches` parcourt `ALL_CACHE_MANAGERS` et
        // `cache.jsp` liste tous les gestionnaires. Un gestionnaire privé reste donc VISIBLE et
        // PURGEABLE — seul le regroupement sous celui de Jahia est perdu. Ne pas alarmer à tort.
        LOG.info("CacheManager de Jahia non fourni (CacheProvider={}) — le cache « {} » vit "
                + "dans le gestionnaire privé « {} ». Il reste listé dans /tools/cache.jsp et purgé "
                + "par « Vider tous les caches ».",
                provider == null ? "absent" : provider.getClass().getName(), cacheName,
                STANDALONE_MANAGER_NAME);
        return standaloneManager();
    }

    /**
     * Obtient — ou reconfigure — le cache dans le gestionnaire donné.
     *
     * <p>La configuration est posée EXPLICITEMENT plutôt qu'héritée du {@code defaultCache}, qui
     * est {@code eternal="true"} : un cache créé sans réglages n'expirerait jamais. Le TTL ehcache
     * ne sert que de filet mémoire ; l'ancienneté servable est mesurée à la lecture par l'appelant.
     */
    private Ehcache obtain(CacheManager manager, int maxEntries, Duration ttl) {
        managerInUse.set(manager);

        var existing = manager.getEhcache(cacheName);
        if (existing != null) {
            existing.getCacheConfiguration().setMaxEntriesLocalHeap(maxEntries);
            existing.getCacheConfiguration().setTimeToLiveSeconds(ttl.getSeconds());
            existing.removeAll();   // reconfiguration = purge
            return existing;
        }

        /*
         * NE PAS remplacer par `addCacheIfAbsent(cacheName)`.
         *
         * La surcharge qui prend une String clone le `defaultCache` — lequel, dans le profil
         * cluster de Jahia, porte un réplicateur JGroups. Nos clés et nos valeurs transiteraient
         * alors sur le réseau, et une valeur non Serializable échouerait à l'exécution, sur
         * cluster uniquement, donc invisible en recette.
         *
         * Avec une Cache explicite, `addCacheIfAbsent` passe par `addCacheNoCheck` sans cloner
         * quoi que ce soit : aucun écouteur, aucune réplication, quelle que soit la valeur de
         * `replicatePuts` dans la configuration de la plateforme.
         */
        CacheConfiguration configuration = new CacheConfiguration(cacheName, maxEntries)
                .eternal(false)
                .timeToLiveSeconds(ttl.getSeconds())
                .memoryStoreEvictionPolicy(MemoryStoreEvictionPolicy.LRU);
        return manager.addCacheIfAbsent(new Cache(configuration));
    }

    /**
     * Aucun champ statique ne mémorise ce gestionnaire : {@code CacheManager.getCacheManager(nom)}
     * EST le registre, et il survit au rechargement du bundle. Un champ statique, lui, serait
     * réinitialisé dans le nouveau classloader tandis que l'ancien gestionnaire subsisterait —
     * ehcache refuse alors deux gestionnaires de même nom, et le redéploiement échouerait.
     */
    public static CacheManager standaloneManager() {
        var existing = CacheManager.getCacheManager(STANDALONE_MANAGER_NAME);
        if (existing != null) {
            return existing;
        }
        synchronized (EhcacheStoreFactory.class) {
            existing = CacheManager.getCacheManager(STANDALONE_MANAGER_NAME);
            return existing != null ? existing : CacheManager.newInstance(new Configuration()
                    .name(STANDALONE_MANAGER_NAME)
                    .defaultCache(new CacheConfiguration("default", 100)));
        }
    }
}
