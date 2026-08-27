package ch.sofinco.core.config;

import org.osgi.service.metatype.annotations.AttributeDefinition;
import org.osgi.service.metatype.annotations.AttributeType;
import org.osgi.service.metatype.annotations.ObjectClassDefinition;

/**
 * Configuration OSGi du cache des appels « Avis Vérifiés ».
 *
 * <p>Le pont vers le service d'avis part en HTTP à chaque rendu de fragment. Sur une page produit
 * cache froid, cela fait quatre lectures de la note — sticker du ProductHero, sticker du pied de
 * page, JSON-LD {@code AggregateRating}, bloc {@code sofnt:avisClient} — plus une lecture des avis
 * eux-mêmes. Ces fenêtres décident combien de ces appels atteignent réellement l'amont.
 *
 * <p>Elles se règlent à chaud plutôt que par une valeur arbitrée en dur : la bonne durée dépend du
 * rythme de publication du site et de la santé de l'amont, deux choses qu'un redéploiement ne
 * devrait pas être nécessaire pour suivre. Un « Vider tous les caches » rafraîchit immédiatement,
 * quelle que soit la valeur — le cache vit dans un {@code CacheManager} ehcache, que Jahia purge et
 * propage au cluster. Enregistrer cette configuration le vide aussi.
 *
 * <p>Les trois timeouts en fin de fichier bornent l'appel lui-même. Ils ne pilotent pas le cache
 * mais le rendent sûr : le pont appelle l'amont en tenant le verrou par clé, et sans borne
 * d'attente ce verrou transforme une panne de l'API en épuisement des threads de rendu.
 */
@ObjectClassDefinition(
        name = "Sofinco — Avis Vérifiés",
        description = "Appels au service d'avis : fenêtres de fraîcheur et d'échec, et timeouts HTTP."
)
public @interface ReviewCacheConfig {

    @AttributeDefinition(
            name = "Fraîcheur de la note (secondes)",
            description = "Durée pendant laquelle la note moyenne est resservie sans rappeler l'amont. "
                        + "La note bouge à l'échelle de l'année, le nombre d'avis à l'échelle du jour : "
                        + "une fenêtre large ne se voit pas. "
                        + "0 désactive la mémorisation ; le verrou par nœud de config, lui, reste actif "
                        + "et effondre les rafales simultanées.",
            type = AttributeType.INTEGER
    )
    /*
     * Aligné sur META-INF/configurations/ch.sofinco.core.reviews.cfg, qui livre la même valeur.
     * Les deux doivent rester égaux : le .cfg est ce qui s'applique réellement, ce défaut ne sert
     * qu'aux instances où il aurait été supprimé — un lecteur qui n'ouvre que ce fichier doit y
     * trouver le comportement observé, pas une valeur historique.
     */
    int averageTtlSeconds() default 600;

    @AttributeDefinition(
            name = "Fraîcheur des avis (secondes)",
            description = "Idem pour la liste des derniers avis affichée par le bloc sofnt:avisClient. "
                        + "Un avis publié met au plus cette durée à apparaître.",
            type = AttributeType.INTEGER
    )
    int reviewsTtlSeconds() default 600;

    @AttributeDefinition(
            name = "Fenêtre d'échec (secondes)",
            description = "Durée pendant laquelle un échec est mémorisé — amont injoignable, page de "
                        + "login du proxy corporate, données malformées. Nettement plus courte que la "
                        + "fraîcheur : elle arrête de marteler un amont mort sans retarder la reprise. "
                        + "0 la désactive, et chaque rendu retentera l'appel pendant tout l'incident.",
            type = AttributeType.INTEGER
    )
    int failureTtlSeconds() default 60;

    @AttributeDefinition(
            name = "Nombre maximum d'entrées",
            description = "Plafond de sécurité. La cardinalité réelle est d'un nœud de configuration "
                        + "par site pour la note, et du nombre de blocs sofnt:avisClient distincts pour "
                        + "les avis — quelques dizaines. Au-delà, ehcache évince la moins récemment "
                        + "utilisée.",
            type = AttributeType.INTEGER
    )
    int maxEntries() default 256;

    /*
     * Timeouts HTTP. Ils ne parlent pas de cache, mais ils vivent ici parce qu'ils en sont
     * indissociables : le pont appelle l'amont EN TENANT le verrou par clé. Sans borne d'attente,
     * un amont qui accepte la connexion puis se tait bloque le thread gagnant indéfiniment, et tous
     * les suivants derrière un `synchronized` non interruptible. Le verrou n'est sûr qu'une fois ces
     * trois valeurs posées.
     *
     * ATTENTION à la différence de sémantique avec les fenêtres ci-dessus : `0` y est un réglage
     * valide qui désactive la mémorisation, alors qu'un timeout à `0` ne l'est pas — un appel sans
     * borne est précisément ce qu'on supprime ici. Toute valeur <= 0 retombe donc sur le défaut.
     *
     * Valeurs volontairement plus serrées que celles de l'APIM (5/10/15) : l'APIM porte une
     * simulation dont la page a besoin, le service d'avis une décoration dont l'absence se dégrade
     * proprement — note manquante, balisage JSON-LD omis.
     */

    @AttributeDefinition(
            name = "Timeout de connexion (secondes)",
            description = "Délai maximum pour établir la connexion TCP/TLS vers l'API Avis Vérifiés. "
                        + "Doit rester > 0 : une valeur nulle ou négative retombe sur le défaut (3).",
            type = AttributeType.INTEGER
    )
    int connectTimeoutSeconds() default 3;

    @AttributeDefinition(
            name = "Timeout de socket (secondes)",
            description = "Délai maximum d'inactivité sur la socket une fois la connexion établie. "
                        + "C'est CELUI-CI qui transforme un amont muet en échec plutôt qu'en blocage. "
                        + "Doit rester > 0 : une valeur nulle ou négative retombe sur le défaut (5).",
            type = AttributeType.INTEGER
    )
    int socketTimeoutSeconds() default 5;

    @AttributeDefinition(
            name = "Timeout de réponse (secondes)",
            description = "Délai maximum d'attente de la réponse complète. Au-delà, l'appel échoue, "
                        + "l'échec est mémorisé sur la fenêtre d'échec, et la page se rend sans la note. "
                        + "Doit rester > 0 : une valeur nulle ou négative retombe sur le défaut (5).",
            type = AttributeType.INTEGER
    )
    int responseTimeoutSeconds() default 5;
}
