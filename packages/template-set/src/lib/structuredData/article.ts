import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { JsonLdNode, JsonLdRef } from "./types";
import { getDate, imgMeta, str } from "#lib/jcr";
import { toAbsoluteUrl } from "#lib/pageUrl";

/**
 * `Article` des pages Actualités et guides, construit depuis le `spnt:news` que
 * porte la page. Le type est défini par un module externe (`portal-common-sofinco`)
 * et n'est pas redéclaré ici ; les champs lus sont `title`, `description`,
 * `picture` et `publishDate`.
 *
 * Les dates sont en ISO 8601 (`yyyy-mm-dd`) et non dans la forme longue française
 * qu'émettait le legacy (`1 avril 2026`) : Google exige la première et ignore
 * silencieusement la seconde, ce qui privait la SERP de la date de mise à jour.
 */
export interface ArticleInput {
	origin: string;
	/** URL publique de la page, également utilisée pour `mainEntityOfPage`. */
	canonical: string;
	id: string;
	/** Auteur éditorial, lu sur le nœud de settings (`articleAuthorName`). */
	authorName: string;
	/** Code langue de la ressource courante (`fr`). */
	inLanguage: string;
	/**
	 * Renvoi vers l'`Organization` du même graphe, ou `undefined` quand celle-ci
	 * n'est pas émise (nœud de settings absent ou non publié). Dans ce cas la
	 * propriété est omise : un `@id` sans cible fait rejeter l'`Article` entier.
	 */
	publisher: JsonLdRef | undefined;
}

export const buildArticle = (
	newsNode: JCRNodeWrapper | null | undefined,
	{ origin, canonical, id, authorName, inLanguage, publisher }: ArticleInput,
): JsonLdNode | null => {
	if (!newsNode) return null;

	const headline = (str(newsNode, "title") || str(newsNode, "jcr:title")).trim();
	if (!headline) return null;

	const datePublished = getDate(newsNode, "publishDate").iso;
	// `jcr:lastModified` est porté par tout nœud JCR ; sans lui la date de
	// publication fait office de dernière modification, ce qui reste exact.
	const dateModified = getDate(newsNode, "jcr:lastModified").iso || datePublished;
	const picture = imgMeta(newsNode, "picture");
	const description = str(newsNode, "description").trim();

	return {
		"@type": "Article",
		"@id": id,
		// Renvoi PUR vers le nœud `WebPage` du même graphe (son `@id` est le canonical),
		// et non une redéclaration `{ "@type": "WebPage", "@id": ... }` : redéclarer un
		// type déjà présent créerait un second nœud concurrent du pivot.
		"mainEntityOfPage": { "@id": canonical },
		"headline": headline,
		"description": description || undefined,
		// `ImageObject` plutôt qu'une URL nue : les dimensions évitent au moteur d'aller
		// mesurer le fichier, et `imgMeta` les a déjà lues sur le nœud image (même
		// source que `og:image:width` dans `#lib/openGraph`).
		"image": picture?.url
			? {
					"@type": "ImageObject",
					"url": toAbsoluteUrl(origin, picture.url),
					"width": picture.width || undefined,
					"height": picture.height || undefined,
				}
			: undefined,
		"inLanguage": inLanguage || undefined,
		// `author` typé `Organization` et non `Person` : les articles sont signés par
		// la rédaction, pas par un individu identifiable — c'est ce que demande la
		// spécification, et un `Person` sans identité affaiblirait l'E-E-A-T.
		//
		// Il porte le seul nom de la rédaction, sans `url` : lui redonner l'adresse de
		// la marque en ferait un DOUBLON anonyme de l'`Organization` déjà présente
		// dans le graphe, exactement ce que le passage à un `@graph` unique élimine.
		// Sans nom de rédaction configuré, on renvoie à la marque plutôt que d'émettre
		// une entité vide.
		"author": authorName ? { "@type": "Organization", "name": authorName } : publisher,
		"publisher": publisher,
		"datePublished": datePublished || undefined,
		"dateModified": dateModified || undefined,
	};
};
