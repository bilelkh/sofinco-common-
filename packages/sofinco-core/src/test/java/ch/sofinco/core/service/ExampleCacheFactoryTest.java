package ch.sofinco.core.service;

import ch.sofinco.core.cache.EhcacheStoreFactory;
import net.sf.ehcache.CacheManager;
import net.sf.ehcache.config.CacheConfiguration;
import net.sf.ehcache.config.Configuration;
import org.jahia.services.cache.CacheProvider;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Négociation du magasin ehcache avec la plateforme.
 *
 * <p>L'essentiel de ces cas porte sur les chemins de REPLI : le cache est une optimisation, il ne
 * doit jamais empêcher le rendu d'une mention légale obligatoire.
 */
class ExampleCacheFactoryTest {

    private static final Duration TTL = Duration.ofMinutes(30);

    @Test
    void createsTheCacheInTheProvidedManager() {
        CacheManager manager = isolatedManager("factory-nominal");
        LastGoodExampleCache cache =
                new ExampleCacheFactory(manager).create(null, 256, TTL, Clock.systemUTC());

        assertThat(cache).isNotNull();
        assertThat(manager.getEhcache(ExampleCacheFactory.CACHE_NAME)).isNotNull();
    }

    /** La configuration est posée EXPLICITEMENT : le defaultCache de Jahia est `eternal=true`. */
    @Test
    void appliesTheRequestedSizeAndTtl() {
        CacheManager manager = isolatedManager("factory-config");
        new ExampleCacheFactory(manager).create(null, 42, Duration.ofMinutes(7), Clock.systemUTC());

        CacheConfiguration applied =
                manager.getEhcache(ExampleCacheFactory.CACHE_NAME).getCacheConfiguration();

        assertThat(applied.getMaxEntriesLocalHeap()).isEqualTo(42);
        assertThat(applied.getTimeToLiveSeconds()).isEqualTo(420);
        assertThat(applied.isEternal()).isFalse();
    }

    /** Reconfiguration : le cache est REUTILISÉ et vidé, jamais dupliqué. */
    @Test
    void reconfiguringReusesAndEmptiesTheSameCache() {
        CacheManager manager = isolatedManager("factory-reconfig");
        ExampleCacheFactory factory = new ExampleCacheFactory(manager);

        LastGoodExampleCache first = factory.create(null, 256, TTL, Clock.systemUTC());
        first.put(key(), example());
        assertThat(first.size()).isEqualTo(1);

        factory.create(null, 128, Duration.ofMinutes(10), Clock.systemUTC());

        assertThat(manager.getCacheNames()).containsOnlyOnce(ExampleCacheFactory.CACHE_NAME);
        assertThat(manager.getEhcache(ExampleCacheFactory.CACHE_NAME).getSize()).isZero();
        assertThat(manager.getEhcache(ExampleCacheFactory.CACHE_NAME)
                .getCacheConfiguration().getMaxEntriesLocalHeap()).isEqualTo(128);
    }

    // ------------------------------------------------------------------ replis

    /**
     * {@code CacheProvider.getCacheManager()} est une méthode PAR DÉFAUT qui renvoie {@code null} :
     * seul {@code EhCacheProvider} la surcharge. C'est ce cas qui avait fait échouer l'activation
     * du service en recette.
     */
    @Test
    void providerReturningNullManager_fallsBackInsteadOfFailing() {
        CacheProvider muet = mock(CacheProvider.class);
        when(muet.getCacheManager()).thenReturn(null);

        LastGoodExampleCache cache =
                new ExampleCacheFactory(null).create(muet, 256, TTL, Clock.systemUTC());

        assertThat(cache).isNotNull();
        assertThat(CacheManager.getCacheManager(EhcacheStoreFactory.STANDALONE_MANAGER_NAME))
                .isNotNull();
    }

    @Test
    void absentProvider_fallsBackToThePrivateManager() {
        assertThat(new ExampleCacheFactory(null).create(null, 256, TTL, Clock.systemUTC()))
                .isNotNull();
    }

    /**
     * Le gestionnaire privé est retrouvé par son NOM, jamais mémorisé dans un champ statique :
     * un champ repartirait à zéro au rechargement du bundle pendant que l'ancien gestionnaire
     * subsiste, et ehcache refuse deux gestionnaires de même nom.
     */
    @Test
    void standaloneManagerIsResolvedByName_notRecreated() {
        assertThat(EhcacheStoreFactory.standaloneManager())
                .isSameAs(EhcacheStoreFactory.standaloneManager());
    }

    // ------------------------------------------------------------------ libération

    @Test
    void disposeRemovesTheCacheButKeepsTheManager() {
        CacheManager manager = isolatedManager("factory-dispose");
        ExampleCacheFactory factory = new ExampleCacheFactory(manager);
        factory.create(null, 256, TTL, Clock.systemUTC());

        factory.dispose();

        assertThat(manager.getEhcache(ExampleCacheFactory.CACHE_NAME)).isNull();
        assertThat(manager.getStatus()).isEqualTo(net.sf.ehcache.Status.STATUS_ALIVE);
    }

    /** Arrêt du bundle avant toute activation : ne doit pas lever. */
    @Test
    void disposeWithoutCreate_isSilent() {
        assertThatCode(() -> new ExampleCacheFactory(isolatedManager("factory-idle")).dispose())
                .doesNotThrowAnyException();
    }

    // ------------------------------------------------------------------ helpers

    /** Un gestionnaire par test : les cas restent indépendants les uns des autres. */
    private static CacheManager isolatedManager(String name) {
        CacheManager existing = CacheManager.getCacheManager(name);
        return existing != null ? existing : CacheManager.newInstance(new Configuration()
                .name(name)
                .defaultCache(new CacheConfiguration("default", 100)));
    }

    private static LastGoodExampleCache.Key key() {
        return new LastGoodExampleCache.Key(
                ch.sofinco.core.enums.CreditVariant.PRET_PERSO, "SRC", 15000L, 48L, null, "o", null);
    }

    private static ch.sofinco.core.model.representativeexample.RepresentativeExample example() {
        return new ch.sofinco.core.model.representativeexample.RepresentativeExample(
                ch.sofinco.core.enums.CreditVariant.PRET_PERSO, "PBPERSO", "15 000 €",
                java.util.Collections.emptyList(), java.util.Collections.emptyMap(), null);
    }
}
