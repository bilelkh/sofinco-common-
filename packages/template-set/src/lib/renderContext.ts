import { server, useServerContext } from "@jahia/javascript-modules-library";

import type { RenderContext } from "org.jahia.services.render";
import type { JCRNodeWrapper } from "org.jahia.services.content";

const getRenderContextGlobal = (): RenderContext => {
	const { renderContext } = useServerContext();
	return renderContext;
};

/**
 * Déclare une dépendance de cache pour la ressource en cours de rendu, afin que
 * le fragment HTML mis en cache par Jahia soit invalidé lorsque le nœud dépendant
 * est modifié (utile pour les lectures JCR indirectes que le cache ne détecte pas
 * automatiquement).
 *
 * Enveloppe `server.render.addCacheDependency`, qui exige un `RenderContext` :
 * on le récupère depuis le contexte serveur courant si non fourni.
 *
 * @param attr - `{ node }`, `{ uuid }`, `{ path }` ou `{ flushOnPathMatchingRegexp }`.
 */
export const addCacheDependency = (
	attr: {
		node?: JCRNodeWrapper;
		uuid?: string;
		path?: string;
		flushOnPathMatchingRegexp?: string;
	},
	renderContext?: RenderContext,
): void => {
	if (!renderContext) {
		renderContext = getRenderContextGlobal();
	}
	server.render.addCacheDependency(attr, renderContext);
};

export const isEditMode = (renderContext?: RenderContext): boolean => {
	if (!renderContext) {
		renderContext = getRenderContextGlobal();
	}
	return renderContext.isEditMode();
};

/**
 * Vrai dès que la page est rendue dans un outil de contribution — Page Builder,
 * aperçu **ou** mode contribute — plutôt qu'en navigation réelle.
 *
 * Sert à éteindre ce qui ne doit exister que pour un visiteur : tags analytics,
 * outils de rejeu de session, pixels tiers.
 *
 * `isLiveMode()` est l'inverse exact et couvre les trois modes d'un seul appel :
 * côté Jahia il compare le mode courant — dérivé du chemin de servlet et du
 * workspace — à la constante `live`. Énumérer les sondes une à une
 * (`isEditMode`, `isPreviewMode`, …) revient à parier qu'on n'en oubliera aucune —
 * pari déjà perdu une fois sur `contribute`.
 *
 * Comparaison à `false` plutôt que négation, et `try` autour de l'appel : au
 * moindre doute — méthode absente d'un contexte de test, valeur non booléenne,
 * appel qui lève (le mode Jahia est nul hors requête de rendu) — on retombe sur
 * « navigation réelle ». Le doute ne doit jamais éteindre le tracking en
 * production, et `!undefined` vaudrait l'inverse.
 */
export const isAuthoringMode = (renderContext?: RenderContext): boolean => {
	if (!renderContext) {
		renderContext = getRenderContextGlobal();
	}
	try {
		return renderContext.isLiveMode() === false;
	} catch {
		return false;
	}
};

/**
 * Returns true when the main resource node name matches the given name.
 * Equivalent to: renderContext.getMainResource().getNode().getName() === name
 */
export function isMainResourceNode(renderContext: RenderContext, name: string): boolean {
	return renderContext.getMainResource().getNode().getName() === name;
}

/**
 * Retrieves an attribute from the server request.
 * getRequestAttribute<string>("attribute")
 * getRequestAttribute<number>("totalReviews")
 *
 * @param attributeName - The exact string name of the request attribute.
 * @returns The typed attribute, or null if not found.
 */
export const getRequestAttribute = <T>(
	attributeName: string,
	renderContext?: RenderContext,
): T | null => {
	if (!renderContext) {
		renderContext = getRenderContextGlobal();
	}
	return renderContext.getRequest().getAttribute(attributeName) as T | null;
};

/**
 * Returns true when the current main resource is the site home page.
 */
export function isHomePage(renderContext?: RenderContext): boolean {
	if (!renderContext) {
		renderContext = getRenderContextGlobal();
	}
	try {
		const current = renderContext.getMainResource().getNode().getPath();
		const home = renderContext.getSite().getHome().getPath();
		return current === home;
	} catch {
		return false;
	}
}

/**
 * Nom public du site — alimente `og:site_name`.
 *
 * `j:title` est le libellé éditorial du site ; `jcr:title` sert de repli pour les
 * sites créés sans libellé explicite. Renvoie `""` plutôt que de lever : la balise
 * n'est alors pas émise du tout.
 *
 * Lecture JCR brute plutôt que `str()` de `#lib/jcr` : ce module est en amont de
 * `jcr.ts` dans le graphe d'imports (`jcr` → `cacheDependency` → `renderContext`),
 * et l'importer ici créerait un cycle.
 */
export function resolveSiteName(renderContext?: RenderContext): string {
	if (!renderContext) {
		renderContext = getRenderContextGlobal();
	}
	try {
		const site = renderContext.getSite();
		if (!site) return "";
		const read = (prop: string): string =>
			site.hasProperty(prop) ? site.getProperty(prop).getString() : "";
		return read("j:title") || read("jcr:title");
	} catch {
		return "";
	}
}

/**
 * Get Url Of Home Page
 */
export function getHomePageUrl(renderContext?: RenderContext): string {
	let logoLink = "/";
	if (!renderContext) {
		renderContext = getRenderContextGlobal();
	}
	try {
		logoLink = renderContext.getSite().getHome().getUrl();
	} catch {
		/* ignore — fallback sur "/" */
	}
	return logoLink;
}
