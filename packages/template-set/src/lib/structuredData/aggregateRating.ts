import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { JsonLdNode } from "./types";
import { getDouble, num } from "#lib/jcr";
import type { Rating } from "#lib/reviews";

/**
 * Note globale du site (Avis Vérifiés), projetée en `AggregateRating`.
 *
 * **Le balisage est OPT-IN par page**, via `enableAggregateRating` du mixin
 * `sofmix:structuredDataOptions` : rien n'est émis tant qu'un contributeur ne l'a pas
 * demandé sur la page. C'est ce qui circonscrit les deux réserves ci-dessous.
 *
 * D'abord la position du balisage. La note ne va PAS sur `Organization` : la policy
 * Google sur les extraits d'avis interdit les avis auto-attribués (un avis sur
 * l'entité A publié sur le site de l'entité A) et n'éligibilise ni `Organization` ni
 * `LocalBusiness` — c'est la POSITION qui est jugée, la provenance tierce des avis n'y
 * change rien. Elle se greffe donc sur le nœud pivot du CONTENU de la page
 * (`attachAggregateRating`), où `aggregateRating` est une propriété valide de
 * `CreativeWork`.
 *
 * Ensuite l'éligibilité. Google ne produit pas d'extrait d'avis pour `FAQPage`,
 * `Article` ni `VideoObject` : le balisage y est schema.org-valide — il ne remonte
 * aucune erreur en Search Console — mais il n'apportera pas d'étoiles en SERP. Et la
 * note reste GLOBALE au site, pas propre à l'article ou à la vidéo balisée. Le seul
 * cas où Google produirait des étoiles suppose une note PAR PRODUIT sur un nœud
 * `Product` dédié, ce que `ReviewServiceBridge.getAverageRate` ne sait pas encore
 * rendre : il ne retourne que la moyenne du site.
 *
 * Enfin la fraîcheur, écart assumé. La note est figée dans le fragment de page, qui
 * n'a pas de `cache.expiration`. Le sticker du pied de page la fige à l'identique :
 * `Footer` et `ProductHero` appellent `mapAvisClientsStickerPropsClient` dans LEUR
 * propre fragment, jamais via la view de `sofnt:avisClientsSticker` — le
 * `cache.expiration: 3600` que porte cette view ne s'applique donc pas au rendu réel.
 * Balisage et affichage dérivent ensemble, jamais l'un sans l'autre, et c'est cette
 * symétrie qui rend l'écart tenable. `ratingValue` arrondi à une décimale ne bouge
 * qu'à l'échelle de l'année ; seul `reviewCount` dérive, jusqu'au prochain flush de
 * dépendance. Rendre toutes les pages du site expirables à l'heure pour ce seul
 * nombre coûterait plus qu'il ne rapporte.
 */

/**
 * Seuils de publication de la note. En dessous, aucun `AggregateRating` n'est
 * construit : une note faible ou assise sur trop peu d'avis dessert la marque autant
 * qu'elle l'expose.
 */
export interface RatingThresholds {
	minValue: number;
	minReviewCount: number;
}

/**
 * Replis alignés sur les valeurs par défaut du CND (`sofnt:structuredDataSettings`).
 * Ils ne servent que le temps décalé entre le déploiement du module et la montée de
 * version du nœud de settings : sans eux, un nœud antérieur au CND lirait `0` et
 * publierait n'importe quelle note.
 */
const DEFAULT_MIN_VALUE = 4;
const DEFAULT_MIN_REVIEW_COUNT = 50;

/** Bornes de l'échelle Avis Vérifiés. */
const BEST_RATING = 5;
const WORST_RATING = 1;

/**
 * Lit les seuils sur le nœud `sofnt:structuredDataSettings`.
 *
 * Fonction distincte de `readOrganizationSettings` bien qu'elles lisent le MÊME nœud :
 * celle-là décrit l'entité de marque, celle-ci la politique de publication de la note.
 * Les mélanger obligerait `OrganizationSettings` à transporter des champs dont
 * `buildOrganization` n'a rien à faire.
 */
export const readRatingThresholds = (
	settingsNode: JCRNodeWrapper | null | undefined,
): RatingThresholds => {
	if (!settingsNode)
		return { minValue: DEFAULT_MIN_VALUE, minReviewCount: DEFAULT_MIN_REVIEW_COUNT };
	return {
		minValue: getDouble(settingsNode, "ratingMinValue", DEFAULT_MIN_VALUE),
		minReviewCount: num(settingsNode, "ratingMinReviewCount", DEFAULT_MIN_REVIEW_COUNT),
	};
};

/**
 * Construit le nœud `AggregateRating`, ou `null` quand les seuils ne sont pas
 * atteints.
 *
 * `ratingValue` et `reviewCount` restent des NOMBRES : `JSON.stringify` produit
 * alors `4.2`, là où le legacy émettait `"4,6"` via `fmt:formatNumber` en locale
 * française — une valeur que Google rejette.
 */
export const buildAggregateRating = (
	rating: Rating | null,
	{ minValue, minReviewCount }: RatingThresholds,
): JsonLdNode | null => {
	if (!rating) return null;
	// `worstRating`/`bestRating` sont émis en dur plus bas : une valeur hors de
	// l'échelle produirait un balisage que Google rejette. On ne publie pas plutôt que
	// de publier faux — même règle que le `canonical` vide dans `graph.ts`.
	if (rating.ratingValue < WORST_RATING || rating.ratingValue > BEST_RATING) return null;
	if (rating.ratingValue < minValue) return null;
	if (rating.reviewCount < minReviewCount) return null;
	if (rating.reviewCount <= 0) return null;

	return {
		"@type": "AggregateRating",
		// Défensif : le service amont arrondit DÉJÀ à une décimale
		// (`calculateWeightedAverageRate` : `Math.round(rate * 10.0) / 10.0`), et l'encart
		// visible affiche donc la même valeur que le balisage. On ne délègue pas la
		// garantie à un bundle externe dont ce module ne maîtrise pas les versions.
		"ratingValue": Math.round(rating.ratingValue * 10) / 10,
		"reviewCount": Math.round(rating.reviewCount),
		// Ce sont les valeurs que Google suppose quand elles sont absentes, mais
		// l'échelle Avis Vérifiés est bien sur 5 : les expliciter retire toute
		// ambiguïté aux validateurs tiers, qui n'appliquent pas tous ce défaut.
		"bestRating": BEST_RATING,
		"worstRating": WORST_RATING,
	};
};

/**
 * Nœuds pouvant porter la note, du plus au moins spécifique.
 *
 * Un SEUL nœud porteur par page. Répéter la même note globale sur chaque
 * `VideoObject` d'une page multi-vidéos la ferait passer pour une note par vidéo,
 * exactement la divergence entre balisage et réalité que le reste du module s'attache
 * à éviter.
 *
 * `LoanOrCredit` en tête parce que c'est le nœud le plus proche du « produit noté » ;
 * `WebPage` en dernier ressort, pour que le drapeau ait un effet sur une page qui ne
 * porte aucun de ces contenus. Tous héritent de `CreativeWork` ou de `Service`, pour
 * lesquels `aggregateRating` est une propriété valide.
 */
const RATING_HOSTS = ["LoanOrCredit", "Article", "FAQPage", "VideoObject", "WebPage"] as const;

/** Un nœud peut porter un `@type` unique ou une liste (cf. `Organization` + `FinancialService`). */
const hasType = (node: JsonLdNode, type: string): boolean => {
	const nodeType = node["@type"];
	return Array.isArray(nodeType) ? nodeType.includes(type) : nodeType === type;
};

/**
 * Greffe la note sur le nœud pivot du graphe, choisi par précédence.
 *
 * Mute le nœud en place plutôt que de le reconstruire : les builders restent purs et
 * ignorants de la note, et l'ordre du graphe — qui porte du sens à la lecture — n'est
 * pas perturbé. Sans note (seuils non atteints, pont OSGi absent, config non
 * renseignée) ou sans nœud éligible, la fonction ne fait rien : la page reste servie
 * sans balisage de note, comme tous les autres dégradés du module.
 */
export const attachAggregateRating = (
	nodes: JsonLdNode[],
	aggregateRating: JsonLdNode | null,
): void => {
	if (!aggregateRating) return;
	for (const type of RATING_HOSTS) {
		const host = nodes.find((node) => hasType(node, type));
		if (host) {
			host.aggregateRating = aggregateRating;
			return;
		}
	}
};
