package ch.sofinco.core.config;

import org.osgi.service.metatype.annotations.AttributeDefinition;
import org.osgi.service.metatype.annotations.AttributeType;
import org.osgi.service.metatype.annotations.ObjectClassDefinition;

/**
 * Configuration OSGi du dédoublonnage des appels APIM de l'exemple représentatif.
 *
 * <p>La bonne valeur dépend d'un chiffre propre au site — <b>combien de pages partagent une même
 * configuration de simulation</b> — et du rythme d'éviction du cache de fragments
 * ({@code HTMLCache}, {@code timeToIdleSeconds=1800}). Elle se règle donc à chaud, en observant le
 * ratio {@code source=cache} contre {@code source=apim}, plutôt que par une valeur arbitrée en dur.
 *
 * <p>Toute modification de cette configuration <b>vide le cache</b> : la nouvelle politique
 * s'applique immédiatement, et c'est aussi le levier manuel dont dispose l'exploitation.
 */
@ObjectClassDefinition(
        name = "Sofinco — Exemple représentatif",
        description = "Dédoublonnage des appels APIM : fenêtre de fraîcheur et fenêtre de secours."
)
public @interface RepresentativeExampleConfig {

    @AttributeDefinition(
            name = "Fenêtre de fraîcheur (secondes)",
            description = "Durée pendant laquelle un résultat APIM est resservi sur le chemin nominal, "
                        + "pour les pages partageant la même configuration de simulation. "
                        + "0 désactive le dédoublonnage (chaque rendu rappelle l'APIM) ; le verrou par "
                        + "configuration, lui, reste actif. "
                        + "Un « Vider tous les caches » rafraîchit immédiatement les chiffres, quelle "
                        + "que soit la valeur : le cache vit dans un CacheManager ehcache, que Jahia "
                        + "purge et propage au cluster. Enregistrer cette configuration le vide aussi.",
            type = AttributeType.INTEGER
    )
    /*
     * Aligné sur META-INF/configurations/ch.sofinco.core.repex.cfg, qui livre la même valeur.
     * Les deux doivent rester égaux : le .cfg est ce qui s'applique réellement, ce défaut ne
     * sert qu'aux instances où il aurait été supprimé — un lecteur qui n'ouvre que ce fichier
     * doit y trouver le comportement observé, pas une valeur historique.
     */
    int freshWindowSeconds() default 300;

    @AttributeDefinition(
            name = "Fenêtre de secours (minutes)",
            description = "Durée pendant laquelle le dernier résultat VALIDE reste servable quand l'APIM "
                        + "échoue. L'exemple représentatif est une mention légale obligatoire : il ne doit "
                        + "pas disparaître sur un incident transitoire. Doit rester supérieure à la fenêtre "
                        + "de fraîcheur.",
            type = AttributeType.INTEGER
    )
    int lastGoodTtlMinutes() default 30;

    @AttributeDefinition(
            name = "Nombre maximum d'entrées",
            description = "Plafond de sécurité. La cardinalité réelle est le nombre de configurations "
                        + "de simulation distinctes du site, soit quelques dizaines.",
            type = AttributeType.INTEGER
    )
    int maxEntries() default 256;

    @AttributeDefinition(
            name = "Campagne — fenêtre de fraîcheur (secondes)",
            description = "Durée pendant laquelle les bornes d'une campagne (montants, durées, taux) "
                        + "sont resservies sans rappeler l'APIM. Fenêtre PROPRE, distincte de celle de "
                        + "l'exemple : une campagne ne dépend que de sa provenance, elle est donc "
                        + "partagée par beaucoup plus de pages. La valeur est bornée par le haut non par "
                        + "le trafic mais par le délai acceptable entre une correction de barème faite "
                        + "par le marketing et son apparition sur le site.",
            type = AttributeType.INTEGER
    )
    int campaignFreshWindowSeconds() default 1800;

    @AttributeDefinition(
            name = "Campagne — fenêtre de secours (minutes)",
            description = "Durée pendant laquelle la dernière campagne VALIDE reste servable quand "
                        + "l'APIM échoue. Ces bornes figurent dans des mentions légales : mieux vaut "
                        + "une valeur de la veille qu'un jeton brut affiché au visiteur.",
            type = AttributeType.INTEGER
    )
    int campaignLastGoodTtlMinutes() default 240;

    @AttributeDefinition(
            name = "Campagne — nombre maximum d'entrées",
            description = "Plafond de sécurité. La cardinalité réelle est le nombre de provenances "
                        + "distinctes du site, soit quelques unités.",
            type = AttributeType.INTEGER
    )
    int campaignMaxEntries() default 64;
}
