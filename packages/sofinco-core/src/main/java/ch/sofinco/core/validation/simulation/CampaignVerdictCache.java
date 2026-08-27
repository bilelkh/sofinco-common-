package ch.sofinco.core.validation.simulation;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Mémorise brièvement le verdict rendu pour une provenance, le temps d'un lot d'écritures.
 *
 * <h2>Ce qu'il évite</h2>
 *
 * <p>Le validateur s'exécute à CHAQUE sauvegarde d'une page portant le mixin, et aucun script du
 * dépôt n'appelle {@code session.setSkipValidation(true)}. Une migration touchant trois cents pages
 * déclenche donc trois cents appels APIM en série, sur une poignée de provenances distinctes. C'est
 * ce cas — pas les quelques sauvegardes d'une session de contribution — qui justifie ce cache.
 *
 * <h2>Pourquoi PAS le cache de {@code CampaignService}</h2>
 *
 * <p>Celui du rendu retient trente minutes et sert une valeur de SECOURS quand l'APIM échoue. Le
 * secours est exactement ce qu'il ne faut pas ici : il ferait valider une provenance retirée depuis.
 * Et trente minutes empêcheraient de voir une campagne que le marketing vient de créer.
 *
 * <h2>Pourquoi pas un ehcache</h2>
 *
 * <p>Le cache de rendu vit dans le {@code CacheManager} de Jahia pour être purgé par « Vider tous
 * les caches » et propagé au cluster. Aucun des deux besoins ne vaut ici : la contribution se fait
 * sur le nœud d'édition, et une entrée qui vit une minute n'a pas besoin d'être purgeable à la
 * main. Une table bornée en mémoire est proportionnée.
 *
 * <h2>Ce qui n'est JAMAIS mémorisé</h2>
 *
 * <p>{@link CampaignLookup.Status#UNAVAILABLE}. Ce verdict signifie « je ne sais pas » : le retenir
 * ferait ignorer un APIM revenu en ligne pendant toute la durée de vie de l'entrée. Un doute doit
 * se redemander, pas se mémoriser.
 */
final class CampaignVerdictCache {

    /**
     * Durée de vie volontairement COURTE.
     *
     * <p>Elle est dimensionnée pour couvrir un lot d'écritures, pas une session de travail. Le
     * critère haut n'est pas le trafic mais le délai acceptable entre la création d'une campagne
     * par le marketing et le moment où le contributeur peut la saisir sans être refusé.
     */
    static final Duration TTL = Duration.ofSeconds(60);

    /**
     * Plafond de sécurité.
     *
     * <p>Les provenances réelles se comptent sur les doigts d'une main. Ce plafond ne protège pas
     * d'un usage normal mais d'un script qui écrirait des provenances aléatoires : sans lui, la
     * table grandirait sans fin dans un processus de longue durée.
     */
    static final int MAX_ENTRIES = 64;

    private final Map<String, Entry> entries = new ConcurrentHashMap<>();
    private final Clock clock;

    CampaignVerdictCache(Clock clock) {
        this.clock = clock;
    }

    /** Verdict mémorisé encore valide, ou {@code null}. */
    CampaignLookup get(String sourceId) {
        if (sourceId == null) {
            return null;
        }
        Entry entry = entries.get(sourceId);
        if (entry == null) {
            return null;
        }
        if (clock.instant().isAfter(entry.expiresAt)) {
            entries.remove(sourceId);
            return null;
        }
        return entry.verdict;
    }

    /** Mémorise un verdict DÉFINITIF. Un {@code UNAVAILABLE} est ignoré, cf. l'en-tête de classe. */
    void put(String sourceId, CampaignLookup verdict) {
        if (sourceId == null || verdict == null
                || verdict.status() == CampaignLookup.Status.UNAVAILABLE) {
            return;
        }
        if (entries.size() >= MAX_ENTRIES) {
            // Purge franche plutôt qu'une éviction LRU : sur une table de cette taille, la
            // complexité d'un classement coûterait plus cher que de tout redemander.
            entries.clear();
        }
        entries.put(sourceId, new Entry(verdict, clock.instant().plus(TTL)));
    }

    /** Vide la table — utilisé par les tests, et disponible pour un diagnostic. */
    void clear() {
        entries.clear();
    }

    int size() {
        return entries.size();
    }

    private static final class Entry {
        private final CampaignLookup verdict;
        private final Instant expiresAt;

        Entry(CampaignLookup verdict, Instant expiresAt) {
            this.verdict = verdict;
            this.expiresAt = expiresAt;
        }
    }
}
