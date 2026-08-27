package ch.sofinco.core.service;

import ch.sofinco.core.cache.EhcacheStoreFactory;
import net.sf.ehcache.CacheManager;
import org.jahia.services.cache.CacheProvider;

import java.time.Clock;
import java.time.Duration;

/**
 * Construit les caches à deux fenêtres du bundle — exemple représentatif et campagne.
 *
 * <p>Séparé de {@code RepresentativeExampleServiceImpl} : ce dernier orchestre un appel APIM, il
 * n'a pas à savoir comment on négocie un {@code CacheManager} avec la plateforme.
 *
 * <p>La négociation elle-même — et tous les pièges ehcache qui vont avec — vit dans
 * {@link EhcacheStoreFactory}, partagé avec les autres caches du bundle. Il ne reste ici que le
 * nom du cache et la politique de lecture propre à chaque famille.
 *
 * <h2>Deux caches, une seule mécanique</h2>
 * <p>Les deux familles partagent le même magasin ehcache et la même politique « deux fenêtres,
 * succès seuls », mais PAS le même cache : elles ont des durées de vie distinctes, et surtout des
 * clés qui ne veulent pas dire la même chose — une signature de simulation d'un côté, une
 * provenance de l'autre. Les mêler rendrait une purge de l'une destructrice pour l'autre.
 *
 * <p>C'est le {@code cacheName} passé au constructeur qui les sépare ; chaque instance de cette
 * fabrique ne gère donc QU'UN cache, et {@link #dispose()} ne retire que le sien.
 */
final class ExampleCacheFactory {

    /** Nom du cache d'exemples — visible dans {@code /tools/cache.jsp}. */
    static final String CACHE_NAME = "sofincoRepresentativeExample";

    /** Nom du cache de campagnes — distinct, pour que les purges restent indépendantes. */
    static final String CAMPAIGN_CACHE_NAME = "sofincoCampaign";

    private final EhcacheStoreFactory stores;

    /** Fabrique du cache d'exemples représentatifs — le cas par défaut. */
    ExampleCacheFactory(CacheManager injectedManager) {
        this(injectedManager, CACHE_NAME);
    }

    /** Fabrique nommée — utilisée par {@code CampaignServiceImpl} avec {@link #CAMPAIGN_CACHE_NAME}. */
    ExampleCacheFactory(CacheManager injectedManager, String cacheName) {
        this.stores = new EhcacheStoreFactory(cacheName, injectedManager);
    }

    /**
     * Construit le cache pour la configuration donnée. Un appel ultérieur reconfigure et vide le
     * cache existant plutôt que d'en créer un second.
     */
    LastGoodExampleCache create(CacheProvider provider, int maxEntries, Duration ttl, Clock clock) {
        return new LastGoodExampleCache(stores.store(provider, maxEntries, ttl), ttl, clock);
    }

    /**
     * Pendant campagne : même magasin, même politique à deux fenêtres, mais une valeur typée
     * {@code CampaignResponse} et une clé qui est la seule provenance.
     */
    LastGoodCampaignCache createCampaignCache(CacheProvider provider, int maxEntries,
                                              Duration ttl, Clock clock) {
        return new LastGoodCampaignCache(stores.store(provider, maxEntries, ttl), ttl, clock);
    }

    /** Retire le cache de son gestionnaire à l'arrêt du bundle. */
    void dispose() {
        stores.dispose();
    }
}
