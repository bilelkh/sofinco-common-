import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import { addDirectChildrenCacheDependency } from "./cacheDependency";
import { getAsBoolean, getChildNode, getChildNodesByType, nodeUrl, str } from "./jcr";

/**
 * Structure Jahia : `page > vanityUrlMapping (jnt:vanityUrls) > * (jnt:vanityUrl)`.
 *
 * Le nom du nœud conteneur est la constante `VANITYURLMAPPINGS_NODE` de
 * `org.jahia.services.seo.jcr.VanityUrlManager` — on cible par NOM plutôt que par
 * type pour ne pas balayer tous les enfants directs de la page (aires de contenu
 * + sous-pages), ce qui déclarerait au passage une dépendance de cache
 * `<page>/[^/]+$` bien trop large.
 */
const VANITY_MAPPING_NODE = "vanityUrlMapping";
const VANITY_URL_TYPE = "jnt:vanityUrl";

/** Hôte de développement : jamais une origine publique exploitable. */
const LOCAL_HOST = "localhost";

/**
 * Retourne la vanity URL par défaut active de la page, ou `""`.
 *
 * Le chemin de nœud brut (`/sites/sofinco/credit-conso`) n'est pas l'URL publique
 * référencée du site (`/credit-consommation/pret-personnel`) : c'est la vanity URL
 * qui l'est, et c'est elle que résolvent les vues JSP du legacy encore en service
 * sur les pages conservées (fil d'Ariane, JSON-LD, balises sociales). Émettre
 * autre chose dans `og:url` scinderait les compteurs de partage Facebook/LinkedIn,
 * qui dédupliquent sur cette valeur.
 *
 * Contrairement à la page — où `jcr:language` vit sur le sous-nœud
 * `j:translation_<lang>` et n'est donc pas lisible depuis le nœud lui-même —
 * `jcr:language` est une **vraie** propriété portée par le nœud `jnt:vanityUrl`.
 * On la filtre donc en première passe, avec repli sur n'importe quelle vanity
 * par défaut active : sur un site monolingue fr le résultat est identique au
 * legacy (aucune divergence possible avec le fil d'Ariane), et l'ajout d'une
 * seconde langue ne produira pas silencieusement l'URL de l'autre langue.
 *
 * Jahia ne tolère qu'une seule vanity `j:default` active par langue : on retourne
 * donc la première trouvée.
 *
 * **Cache dep** : `addDirectChildrenCacheDependency(page, "vanityUrlMapping")` est
 * déclarée inconditionnellement — `getChildNode` ne déclare rien quand l'enfant est
 * absent, or c'est précisément le cas où la création de la 1ʳᵉ vanity doit invalider
 * le fragment. `getChildNodesByType` ajoute ensuite `{ node }` sur chaque entrée.
 */
export const resolveVanityUrl = (
	pageNode: JCRNodeWrapper | null | undefined,
	lang: string,
): string => {
	if (!pageNode) return "";
	try {
		addDirectChildrenCacheDependency(pageNode, VANITY_MAPPING_NODE);
		const mapping = getChildNode(pageNode, VANITY_MAPPING_NODE);
		if (!mapping) return "";

		const entries = getChildNodesByType(mapping, VANITY_URL_TYPE);
		// `matchLang` vide = seconde passe, toutes langues confondues.
		const pick = (matchLang: string): string => {
			for (const vanity of entries) {
				if (!getAsBoolean(vanity, "j:active")) continue;
				if (!getAsBoolean(vanity, "j:default")) continue;
				if (matchLang && str(vanity, "jcr:language") !== matchLang) continue;
				const url = str(vanity, "j:url").trim();
				if (url) return url;
			}
			return "";
		};

		return pick(lang) || pick("");
	} catch {
		return "";
	}
};

/**
 * Origine absolue (`https://host`) des URLs sociales et du canonical.
 *
 * Priorité au `serverName` configuré du site, comme les vues JSP de référence :
 * `URLGenerator.getServer()` dérive de la requête entrante et renvoie l'hôte
 * interne quand Jahia tourne derrière esigate/Apache sans propagation complète des
 * `X-Forwarded-Proto` / `X-Forwarded-Host` — on émettrait alors un
 * `http://tomcat:8080/...` injoignable pour les crawlers.
 *
 * `getServer()` reste le repli : c'est la bonne source en local, où le site n'a pas
 * de `serverName` configuré (Jahia renvoie alors `localhost`).
 */
export const resolveOrigin = (renderContext: RenderContext): string => {
	try {
		const site = renderContext.getSite();
		const serverName = site ? (site.getServerName() ?? "").trim() : "";
		if (serverName && serverName !== LOCAL_HOST) {
			const origin = /^https?:\/\//i.test(serverName) ? serverName : `https://${serverName}`;
			return origin.replace(/\/+$/, "");
		}
	} catch {
		/* repli sur l'URLGenerator ci-dessous */
	}
	try {
		return (renderContext.getURLGenerator().getServer() ?? "").replace(/\/+$/, "");
	} catch {
		return "";
	}
};

/**
 * Préfixe une URL de média/page par l'origine du serveur — les crawlers sociaux
 * exigent des URLs absolues. Les URLs déjà absolues (ou protocol-relative) sont
 * renvoyées telles quelles.
 */
export const toAbsoluteUrl = (origin: string, url: string): string => {
	if (!url) return "";
	if (url.startsWith("//") || /^https?:\/\//i.test(url)) return url;
	if (!origin) return url;
	const base = origin.replace(/\/+$/, "");
	return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
};

/**
 * URL publique absolue de la page : vanity URL par défaut si elle existe, sinon
 * l'URL de nœud, sinon l'URL courante. C'est à la fois `og:url`, `twitter:url` et
 * `<link rel="canonical">` — à résoudre une seule fois par rendu, dans `Layout`.
 */
export const resolvePageUrl = (
	renderContext: RenderContext,
	pageNode: JCRNodeWrapper | null | undefined,
	{ origin, lang }: { origin: string; lang: string },
): string => {
	const currentUrl = (): string => {
		try {
			return renderContext.getURLGenerator().getCurrent() ?? "";
		} catch {
			return "";
		}
	};
	const path =
		resolveVanityUrl(pageNode, lang) || (pageNode ? nodeUrl(pageNode) : "") || currentUrl();
	return toAbsoluteUrl(origin, path);
};
