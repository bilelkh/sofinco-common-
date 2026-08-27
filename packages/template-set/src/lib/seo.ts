import type { JCRNodeWrapper } from "org.jahia.services.content";
import { getAsBoolean, hasMixin, str, strList } from "./jcr";

/**
 * Mixin fourni par le module `portal-common-sofinco` (non déclaré ici) :
 *
 * ```
 * [spmix:seoPageOptions] mixin
 *   extends = jnt:page
 *   itemtype = metadata
 *   - titleSEO (string) i18n nofulltext
 *   - noindex (boolean)
 *   - nofollow (boolean)
 * ```
 */
export const SEO_PAGE_OPTIONS_MIXIN = "spmix:seoPageOptions";

export interface SeoPageOptions {
	titleSEO: string;
	noindex: boolean;
	nofollow: boolean;
}

/**
 * Lit les propriétés du mixin `spmix:seoPageOptions` sur la page, ou `null`
 * quand la page ne le porte pas.
 *
 * Le `isNodeType` est protégé : le mixin vient d'un module externe, il peut
 * être absent du runtime (même précaution que pour `spmix:eaPageOptions` dans
 * `#lib/tracking`).
 */
export const readSeoPageOptions = (
	pageNode: JCRNodeWrapper | null | undefined,
): SeoPageOptions | null => {
	if (!pageNode) return null;
	try {
		if (!hasMixin(pageNode, SEO_PAGE_OPTIONS_MIXIN)) return null;
	} catch {
		return null;
	}
	return {
		titleSEO: str(pageNode, "titleSEO").trim(),
		noindex: getAsBoolean(pageNode, "noindex"),
		nofollow: getAsBoolean(pageNode, "nofollow"),
	};
};

/**
 * Résout le `<title>` de la page : `titleSEO` si elle est renseignée, sinon
 * `fallbackTitle` (le `jcr:title` de la page).
 */
export const resolvePageTitle = (
	pageNode: JCRNodeWrapper | null | undefined,
	fallbackTitle: string,
): string => readSeoPageOptions(pageNode)?.titleSEO || fallbackTitle;

/**
 * Résout la `<meta name="description">` de la page : `jcr:description`, la
 * description standard Jahia (i18n, éditable dans l'onglet metadata de la page).
 *
 * Indépendante du mixin `spmix:seoPageOptions` : la description est portée par
 * `jnt:page` lui-même, elle est donc disponible sur toutes les pages. Renvoie
 * `""` quand elle n'est pas renseignée — la balise n'est alors pas rendue,
 * plutôt qu'émise vide (Google préfère générer son propre extrait qu'en lire un
 * de vide).
 */
export const resolvePageDescription = (pageNode: JCRNodeWrapper | null | undefined): string =>
	pageNode ? str(pageNode, "jcr:description").trim() : "";

/**
 * Résout la `<meta name="keywords">` de la page à partir de `j:tagList` — la
 * propriété multivaluée alimentée par le champ **Tags** de l'onglet metadata
 * (mixin Jahia standard `jmix:tagged`), donc disponible sur toutes les pages.
 *
 * Les tags sont émis dans l'ordre de saisie, séparés par `", "`. Renvoie `""`
 * quand aucun tag n'est saisi — la balise n'est alors pas rendue.
 */
export const resolvePageKeywords = (pageNode: JCRNodeWrapper | null | undefined): string => {
	if (!pageNode) return "";
	return strList(pageNode, "j:tagList")
		.map((tag) => tag.trim())
		.filter(Boolean)
		.join(", ");
};

/**
 * Construit le contenu de `<meta name="robots">` à partir de `noindex` /
 * `nofollow`, ou `null` quand aucune restriction n'est demandée — dans ce cas
 * la balise n'est pas rendue du tout (le défaut des crawlers est déjà
 * `index, follow`, une balise explicite n'apporterait rien).
 */
export const resolveRobotsContent = (
	pageNode: JCRNodeWrapper | null | undefined,
): string | null => {
	const options = readSeoPageOptions(pageNode);
	if (!options) return null;
	const directives: string[] = [];
	if (options.noindex) directives.push("noindex");
	if (options.nofollow) directives.push("nofollow");
	return directives.length > 0 ? directives.join(", ") : null;
};
