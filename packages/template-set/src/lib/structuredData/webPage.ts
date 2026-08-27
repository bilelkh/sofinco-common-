import type { JsonLdNode, JsonLdRef } from "./types";

/**
 * Nœud `WebPage` — le PIVOT du graphe de la page.
 *
 * C'est le nœud qui manquait : `Article.mainEntityOfPage` renvoyait à un `WebPage`
 * qui n'existait nulle part dans le document, exactement le renvoi pendant que
 * `graph.ts` s'interdit pour `publisher` et `provider`. Sans lui, `BreadcrumbList`,
 * `Article`, `FAQPage` et les `VideoObject` coexistent sans relation : rien ne dit
 * qu'ils décrivent la même page, ni que cette page appartient au site.
 *
 * Son `@id` est le canonical lui-même — pas une ancre `#webpage`. C'est la convention
 * que suit `mainEntityOfPage`, et elle rend le nœud adressable depuis un autre
 * document du site (un `isPartOf` ou un `relatedLink` d'une page voisine).
 *
 * **Pas de `datePublished` / `dateModified` ici.** Le `jcr:lastModified` d'un
 * `jnt:page` ne bouge que lorsqu'on touche aux propriétés DE LA PAGE : éditer un bloc
 * de contenu ne le met pas à jour. Le publier annoncerait une fraîcheur que la page
 * n'a pas. Les dates fiables sont celles que le contributeur saisit sur le
 * `spnt:news`, et elles sont déjà portées par le nœud `Article`.
 */
export interface WebPageInput {
	/** URL publique de la page — sert à la fois d'`@id` et d'`url`. */
	canonical: string;
	/** Titre déjà résolu par `#lib/seo`, le même que `<title>` et `og:title`. */
	name: string;
	/** Description déjà résolue par `#lib/seo`, la même que `<meta name="description">`. */
	description: string;
	/** Code langue de la ressource courante (`fr`). */
	inLanguage: string;
	/** Renvoi vers le `WebSite` du graphe, `undefined` quand il n'est pas émis. */
	isPartOf: JsonLdRef | undefined;
	/** Renvoi vers le `BreadcrumbList` du graphe, `undefined` quand la page n'en rend pas. */
	breadcrumb: JsonLdRef | undefined;
}

/**
 * Construit le nœud `WebPage`, ou `null` sans canonical — sans URL publique le nœud
 * n'aurait pas d'`@id` résolvable et les renvois qui le visent resteraient pendants.
 */
export const buildWebPage = ({
	canonical,
	name,
	description,
	inLanguage,
	isPartOf,
	breadcrumb,
}: WebPageInput): JsonLdNode | null => {
	if (!canonical) return null;

	return {
		"@type": "WebPage",
		"@id": canonical,
		"url": canonical,
		"name": name || undefined,
		"description": description || undefined,
		"inLanguage": inLanguage || undefined,
		"isPartOf": isPartOf,
		"breadcrumb": breadcrumb,
	};
};
