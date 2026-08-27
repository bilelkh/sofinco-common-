import type { RenderContext } from "org.jahia.services.render";
import type { BreadcrumbItem } from "sofinco-react";
import { getCurrentPageNode } from "./jcr";
import { buildSocialMetaTags, toOgLocale, type SocialMetaTag } from "./openGraph";
import { resolveOrigin, resolvePageUrl } from "./pageUrl";
import {
	resolvePageDescription,
	resolvePageKeywords,
	resolvePageTitle,
	resolveRobotsContent,
} from "./seo";
import { resolveSiteName } from "./renderContext";
import { buildStructuredDataGraph, serializeJsonLd } from "./structuredData/graph";

/**
 * Couche d'assemblage du `<head>` : `#lib/seo`, `#lib/openGraph`, `#lib/pageUrl`,
 * `#lib/renderContext` et `#lib/structuredData` résolvent chacun leur morceau, ce
 * module décide de ce qui est réellement rendu.
 *
 * Elle vit dans un `.ts` (et non inlinée dans `templates/Layout.tsx`) parce que la
 * couverture Vitest n'instrumente que les fichiers `.ts` de `src` (voir le `include`
 * de `coverage` dans `vitest.config.ts`) : toute logique laissée dans un `.tsx` est
 * intestable par construction. `Layout` ne garde que du JSX bête.
 */

/**
 * Ce que `Layout` sait de la requête. Tout le reste est lu depuis le
 * `RenderContext` — inutile de faire redescendre la page, l'origine ou le nom du
 * site depuis le composant.
 */
export interface HeadMetaInput {
	renderContext: RenderContext;
	/** Titre de repli : le `jcr:title` que passent les templates de `templates/Page/`. */
	fallbackTitle: string;
	/** `currentResource.getLocale().getLanguage()` — p. ex. `fr`. */
	language: string;
	/** `currentResource.getLocale().getCountry()` — souvent `""` sur un site monolingue. */
	country: string;
	/**
	 * Fil d'Ariane que le template rend déjà (`buildBreadcrumbLayoutProps().items`),
	 * réutilisé tel quel pour le `BreadcrumbList` du JSON-LD. Absent pour un template
	 * qui n'en affiche pas : le graphe n'émet alors pas de fil d'Ariane, plutôt que
	 * d'en refabriquer un — cf. `StructuredDataInput.breadcrumbItems`.
	 */
	breadcrumbItems?: BreadcrumbItem[];
}

/**
 * Attributs microdata de `<html>`, prêts à étaler en JSX. Objet vide quand
 * aucune balise `itemprop` n'est émise : déclarer un scope schema.org sans
 * aucune propriété dedans n'apporte rien et brouille le balisage.
 */
export interface MicrodataAttributes {
	itemScope?: true;
	itemType?: string;
}

/** Tout ce que le `<head>` a besoin de rendre, déjà décidé. */
export interface HeadMeta {
	/** Attribut `lang` de `<html>`. */
	lang: string;
	/** Contenu de `<title>`. */
	title: string;
	/** `<link rel="canonical">` ; `""` quand aucune URL publique n'est résolvable. */
	canonical: string;
	/**
	 * Toutes les `<meta>` du `<head>` dans l'ordre de rendu : description,
	 * keywords, robots, puis les balises sociales. `content` est toujours non
	 * vide — une balise sans valeur n'entre pas dans la liste, elle n'est donc
	 * jamais rendue vide.
	 */
	metas: SocialMetaTag[];
	microdata: MicrodataAttributes;
	/**
	 * Contenu du `<script type="application/ld+json">` : le `@graph` de la page,
	 * déjà sérialisé et échappé pour une injection inline. `""` quand il n'y a rien
	 * à émettre — la balise n'est alors pas rendue du tout.
	 */
	jsonLd: string;
}

const MICRODATA_TYPE = "https://schema.org/WebPage";

/**
 * Construit l'intégralité des métadonnées du `<head>` pour la page courante.
 *
 * L'URL publique absolue n'est résolue qu'une fois et sert à la fois de
 * `<link rel="canonical">`, d'`og:url`, de `twitter:url` et d'ancre `@id` des
 * nœuds JSON-LD de la page — cf. `#lib/pageUrl`. Titre et description résolus
 * sont réinjectés dans le graphe, ce qui garantit que le balisage structuré ne
 * peut pas diverger des balises `<title>` / `<meta>` / Open Graph.
 */
export const buildHeadMeta = ({
	renderContext,
	fallbackTitle,
	language,
	country,
	breadcrumbItems = [],
}: HeadMetaInput): HeadMeta => {
	const pageNode = getCurrentPageNode(renderContext);
	const title = resolvePageTitle(pageNode, fallbackTitle);
	const description = resolvePageDescription(pageNode);

	const origin = resolveOrigin(renderContext);
	const canonical = resolvePageUrl(renderContext, pageNode, { origin, lang: language });

	// La locale JCR vaut en général la langue seule (`fr`) : `toOgLocale` en déduit
	// alors le territoire. On ne compose `language_country` que quand la ressource
	// porte réellement un pays, sinon on produirait un `fr_` invalide.
	// Résolu une seule fois : il nomme le même site dans `og:site_name` et dans le
	// nœud `WebSite` du graphe, qui ne peuvent donc pas diverger.
	const siteName = resolveSiteName(renderContext);

	const socialMetaTags = buildSocialMetaTags(pageNode, {
		title,
		description,
		pageUrl: canonical,
		origin,
		siteName,
		locale: toOgLocale(country ? `${language}_${country}` : language),
	});

	/*
	 * Le graphe est le seul morceau du `<head>` qui interroge le JCR au-delà de la
	 * page courante (requête de contenus, lecture du nœud de settings, appel du pont
	 * `ReviewServiceBridge`). Comme chacun des autres résolveurs de ce module, il
	 * dégrade au lieu de faire tomber le rendu : sans balisage structuré la page
	 * reste servie, alors qu'une exception non rattrapée dans le `<head>` la
	 * transformerait en 500.
	 */
	const graph = (() => {
		try {
			return buildStructuredDataGraph({
				renderContext,
				pageNode,
				origin,
				canonical,
				breadcrumbItems,
				title,
				description,
				language,
				siteName,
			});
		} catch {
			return [];
		}
	})();

	const metas: SocialMetaTag[] = [];
	const push = (tag: SocialMetaTag) => {
		if (tag.content) metas.push(tag);
	};

	push({ key: "description", name: "description", content: description });
	push({ key: "keywords", name: "keywords", content: resolvePageKeywords(pageNode) });
	push({ key: "robots", name: "robots", content: resolveRobotsContent(pageNode) ?? "" });
	metas.push(...socialMetaTags);

	return {
		lang: language,
		title,
		canonical,
		metas,
		jsonLd: serializeJsonLd(graph),
		// Les balises `itemprop` (Google) n'ont de sens qu'à l'intérieur d'un scope
		// microdata — on ne le déclare que quand elles sont effectivement émises.
		microdata: socialMetaTags.some((tag) => tag.itemProp)
			? { itemScope: true, itemType: MICRODATA_TYPE }
			: {},
	};
};
