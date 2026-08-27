import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { JsonLdNode, JsonLdRef } from "./types";
import { imgMeta, str, strList } from "#lib/jcr";
import { toAbsoluteUrl } from "#lib/pageUrl";

/**
 * Nœud `Organization` du `@graph` — l'entité de marque à laquelle se rattachent
 * `publisher` (Article, VideoObject) et `provider` (LoanOrCredit).
 *
 * Il est émis sur TOUTES les pages, et pas seulement sur la home : Google ne résout
 * un `@id` qu'à l'intérieur d'un même document, donc un simple renvoi sur une page
 * interne laisserait `publisher` et `provider` pendants pour un crawler qui ne
 * récupère que cette page. Seul l'`aggregateRating` reste conditionné (home et pages
 * produit).
 *
 * Nom du nœud de configuration sous `contents/site-settings`, créé par
 * `settings/groovyScripts/init-structured-data-settings.groovy`.
 */
export const STRUCTURED_DATA_SETTINGS_NODE = "structured-data-settings";

/** Repli code pour l'auteur des articles quand la valeur par défaut du CND n'a pas été appliquée. */
const DEFAULT_ARTICLE_AUTHOR = "La Rédaction Sofinco";

/** Ancre stable de l'entité, indépendante de la page qui la porte. */
export const organizationId = (origin: string): string => `${origin}/#organization`;

/** Renvoi vers l'`Organization` du même document. */
export const organizationRef = (origin: string): JsonLdRef => ({ "@id": organizationId(origin) });

/**
 * Logo de la marque, dimensions comprises. Google exige un logo d'au moins 112 px de
 * côté et les dimensions lui évitent d'aller chercher le fichier pour les mesurer —
 * c'est exactement ce que `#lib/openGraph` publie déjà pour `og:image`, via le même
 * `imgMeta`.
 */
export interface OrganizationLogo {
	url: string;
	width: number;
	height: number;
}

export interface OrganizationSettings {
	legalName: string;
	url: string;
	logo: OrganizationLogo | null;
	description: string;
	founder: string;
	telephone: string;
	contactType: string;
	streetAddress: string;
	postalCode: string;
	addressLocality: string;
	addressCountry: string;
	sameAs: string[];
	/** Alimente `Article.author` — lu ici parce qu'il vit sur le même nœud de settings. */
	articleAuthorName: string;
}

/**
 * Lit le nœud de settings. Retourne `null` uniquement quand le nœud est absent —
 * un `legalName` vide donne des settings exploitables (auteur d'article) mais
 * empêchera `buildOrganization` d'émettre le nœud.
 */
export const readOrganizationSettings = (
	settingsNode: JCRNodeWrapper | null | undefined,
	origin: string,
): OrganizationSettings | null => {
	if (!settingsNode) return null;
	const logo = imgMeta(settingsNode, "logo");
	return {
		legalName: str(settingsNode, "legalName").trim(),
		url: str(settingsNode, "organizationUrl").trim() || origin,
		logo: logo?.url
			? { url: toAbsoluteUrl(origin, logo.url), width: logo.width, height: logo.height }
			: null,
		description: str(settingsNode, "description").trim(),
		founder: str(settingsNode, "founder").trim(),
		telephone: str(settingsNode, "telephone").trim(),
		contactType: str(settingsNode, "contactType").trim() || "customer service",
		streetAddress: str(settingsNode, "streetAddress").trim(),
		postalCode: str(settingsNode, "postalCode").trim(),
		addressLocality: str(settingsNode, "addressLocality").trim(),
		addressCountry: str(settingsNode, "addressCountry").trim(),
		sameAs: strList(settingsNode, "sameAs")
			.map((url) => url.trim())
			.filter(Boolean),
		articleAuthorName: str(settingsNode, "articleAuthorName").trim() || DEFAULT_ARTICLE_AUTHOR,
	};
};

/**
 * Construit le nœud `Organization`. Retourne `null` sans `legalName` : une entité
 * sans nom n'apprend rien à un moteur et brouille le graphe.
 *
 * `address` et `contactPoint` ne sont émis que lorsqu'ils portent au moins une
 * valeur — le legacy émettait une `PostalAddress` de champs vides sur les sites non
 * configurés.
 *
 * **Aucun `aggregateRating` ici.** La policy Google sur les extraits d'avis interdit
 * les avis auto-attribués — un avis portant sur l'entité A publié sur le site de
 * l'entité A — et ni `Organization` ni `LocalBusiness` ne sont éligibles à l'extrait.
 * La provenance tierce des avis (Avis Vérifiés) n'y change rien : c'est la POSITION
 * du balisage qui est jugée. La note se greffe donc sur le nœud pivot du CONTENU de
 * la page, et uniquement là où un contributeur l'a activée — cf.
 * `attachAggregateRating` dans `./aggregateRating`.
 */
export const buildOrganization = (
	settings: OrganizationSettings | null,
	{ origin }: { origin: string },
): JsonLdNode | null => {
	if (!settings?.legalName) return null;

	const address: JsonLdNode = { "@type": "PostalAddress" };
	if (settings.streetAddress) address.streetAddress = settings.streetAddress;
	if (settings.postalCode) address.postalCode = settings.postalCode;
	if (settings.addressLocality) address.addressLocality = settings.addressLocality;
	if (settings.addressCountry) address.addressCountry = settings.addressCountry;
	const hasAddress = Object.keys(address).length > 1;

	return {
		// `FinancialService` décrit bien plus précisément un établissement de crédit
		// qu'`Organization` seul, et c'est un signal d'entité qui compte sur du YMYL
		// finance. Il n'est ajouté QUE si l'adresse est renseignée : c'est un sous-type
		// de `LocalBusiness`, pour lequel Google attend `name` ET `address` — le
		// déclarer sans adresse échangerait un gain de précision contre un
		// « missing required field » en Search Console.
		"@type": hasAddress ? ["Organization", "FinancialService"] : "Organization",
		"@id": organizationId(origin),
		"name": settings.legalName,
		"url": settings.url || undefined,
		"logo": settings.logo
			? {
					"@type": "ImageObject",
					"url": settings.logo.url,
					// Dimensions omises plutôt que nulles quand le fichier ne les porte pas :
					// un `width: 0` décrirait une image vide.
					"width": settings.logo.width || undefined,
					"height": settings.logo.height || undefined,
				}
			: undefined,
		"description": settings.description || undefined,
		"founder": settings.founder || undefined,
		"address": hasAddress ? address : undefined,
		"contactPoint": settings.telephone
			? {
					"@type": "ContactPoint",
					"telephone": settings.telephone,
					"contactType": settings.contactType,
				}
			: undefined,
		"sameAs": settings.sameAs.length > 0 ? settings.sameAs : undefined,
	};
};
