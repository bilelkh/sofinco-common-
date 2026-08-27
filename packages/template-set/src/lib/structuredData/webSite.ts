import type { JsonLdNode, JsonLdRef } from "./types";

/**
 * Nœud `WebSite` — l'entité « site », distincte de l'entité de marque.
 *
 * Sans lui, le `WebPage` de chaque page n'a rien à quoi se rattacher : le graphe
 * décrit des pages isolées au lieu d'un site dont une organisation est l'éditeur.
 * C'est l'ancrage qui permet aux moteurs de rattacher toutes les pages du domaine à
 * la même entité.
 *
 * **Pas de `potentialAction: SearchAction`.** C'était la seule raison technique de
 * déclarer un `WebSite` du temps où Google en tirait la « sitelinks searchbox » ;
 * ce résultat enrichi a été retiré fin 2024 et la propriété n'est plus interprétée.
 * L'émettre reviendrait à décrire une capacité que rien ne consomme.
 */

/** Ancre stable du site, indépendante de la page qui la porte. */
export const webSiteId = (origin: string): string => `${origin}/#website`;

/** Renvoi vers le `WebSite` du même document. */
export const webSiteRef = (origin: string): JsonLdRef => ({ "@id": webSiteId(origin) });

export interface WebSiteInput {
	origin: string;
	/** Nom du site, déjà résolu par `#lib/renderContext` (`j:title` puis `jcr:title`). */
	name: string;
	/** Code langue de la ressource courante (`fr`). */
	inLanguage: string;
	/**
	 * Renvoi vers l'`Organization` du graphe, `undefined` quand elle n'est pas émise —
	 * même règle que pour `Article.publisher` : un `@id` sans cible dans le document
	 * est un renvoi pendant.
	 */
	publisher: JsonLdRef | undefined;
}

/**
 * Construit le nœud `WebSite`, ou `null` sans origine ni nom : un site sans nom
 * n'ancre aucune entité et n'apporte que du bruit au graphe.
 */
export const buildWebSite = ({
	origin,
	name,
	inLanguage,
	publisher,
}: WebSiteInput): JsonLdNode | null => {
	if (!origin || !name) return null;

	return {
		"@type": "WebSite",
		"@id": webSiteId(origin),
		"url": `${origin}/`,
		"name": name,
		"inLanguage": inLanguage || undefined,
		"publisher": publisher,
	};
};
