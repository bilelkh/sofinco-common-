import { describe, it, expect, vi } from "vitest";
import { makeNode, type PropValue } from "#test/jahia";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";

vi.mock("#lib/jcr", () => import("#test/jahia"));
// `resolveVanityUrl` (via `resolvePageUrl`) déclare une dépendance de cache qui
// passe par `useServerContext()`, indisponible hors moteur Jahia.
vi.mock("./cacheDependency", () => ({
	addDirectChildrenCacheDependency: vi.fn(),
	addNodeCacheDependency: vi.fn(),
	addSubtreeCacheDependency: vi.fn(),
}));
// Même raison : `findPageContent` (données structurées) interroge le dépôt via
// `useServerContext()` pour obtenir la session JCR.
const pageContentNodes = vi.fn<() => JCRNodeWrapper[]>(() => []);
vi.mock("./jcrQuery", () => ({ jcrQuery: () => pageContentNodes() }));
// `resolvePageUrl` et les builders résolvent leurs URLs via la bibliothèque Jahia
// et déclarent des dépendances de cache — ni l'une ni l'autre n'existent hors
// moteur. Même stratégie que `breadcrumb.test.ts`.
vi.mock("@jahia/javascript-modules-library", () => ({
	buildNodeUrl: (node: { getUrl(): string }) => node.getUrl(),
	useServerContext: vi.fn(),
	server: { osgi: { getService: () => null }, render: { addCacheDependency: vi.fn() } },
}));
vi.mock("./renderContext", async (importOriginal) => ({
	...(await importOriginal<typeof import("./renderContext")>()),
	addCacheDependency: vi.fn(),
	isEditMode: () => false,
}));

import { OPEN_GRAPH_TAGS_MIXIN } from "./openGraph";
import { SEO_PAGE_OPTIONS_MIXIN } from "./seo";
import { buildHeadMeta, type HeadMeta } from "./seoHead";

/**
 * Ces tests couvrent la couche d'ASSEMBLAGE — les collaborateurs (`#lib/seo`,
 * `#lib/openGraph`, `#lib/pageUrl`, `#lib/renderContext`) tournent pour de vrai,
 * seul l'accès JCR est simulé. On vérifie donc le câblage exact que rendait
 * auparavant `Layout.tsx` : ordre des balises, conditions d'omission, scope
 * microdata et composition de la locale.
 */

const image = (url: string, width?: number, height?: number) =>
	makeNode({
		url,
		displayableName: "Visuel",
		props: {
			...(width === undefined ? {} : { "j:width": width }),
			...(height === undefined ? {} : { "j:height": height }),
		},
	});

/** Page portant les deux mixins externes, avec les propriétés demandées. */
const page = (props: Record<string, PropValue> = {}, mixins: string[] = []) =>
	makeNode({
		nodeTypes: ["jnt:page", ...mixins],
		path: "/sites/sofinco/credit-conso",
		url: "/sites/sofinco/credit-conso.html",
		props,
	});

const context = (
	pageNode: JCRNodeWrapper | null,
	{ serverName = "www.sofinco.fr", siteTitle = "Sofinco" } = {},
): RenderContext =>
	({
		getMainResource: () => ({
			getNode: () => {
				if (!pageNode) throw new Error("no main resource");
				return pageNode;
			},
		}),
		getSite: () => ({
			getServerName: () => serverName,
			hasProperty: (name: string) => name === "j:title",
			getProperty: () => ({ getString: () => siteTitle }),
		}),
		getURLGenerator: () => ({
			getServer: () => "http://tomcat:8080",
			getCurrent: () => "/fr/current.html",
		}),
	}) as unknown as RenderContext;

const build = (
	pageNode: JCRNodeWrapper | null,
	over: Partial<Parameters<typeof buildHeadMeta>[0]> = {},
) =>
	buildHeadMeta({
		renderContext: context(pageNode),
		fallbackTitle: "Titre de page",
		language: "fr",
		country: "",
		...over,
	});

/** Flattens the meta list into `key → content` for readable assertions. */
const byKey = (head: HeadMeta) => Object.fromEntries(head.metas.map((m) => [m.key, m.content]));

describe("buildHeadMeta — titre et canonical", () => {
	it("préfère titleSEO au titre de repli", () => {
		const head = build(page({ titleSEO: "Crédit conso | Sofinco" }, [SEO_PAGE_OPTIONS_MIXIN]));
		expect(head.title).toBe("Crédit conso | Sofinco");
	});

	it("retombe sur le jcr:title passé par le template de page", () => {
		expect(build(page()).title).toBe("Titre de page");
	});

	it("résout le canonical en absolu sur l'origine du site", () => {
		expect(build(page()).canonical).toBe("https://www.sofinco.fr/sites/sofinco/credit-conso.html");
	});

	it("expose la langue telle quelle pour l'attribut lang de <html>", () => {
		expect(build(page(), { language: "en" }).lang).toBe("en");
	});
});

describe("buildHeadMeta — métas non sociales", () => {
	it("émet description, keywords et robots dans cet ordre", () => {
		const head = build(
			page(
				{
					"jcr:description": "  Financez votre projet  ",
					"j:tagList": ["crédit", " conso ", ""],
					"noindex": true,
					"nofollow": true,
				},
				[SEO_PAGE_OPTIONS_MIXIN],
			),
		);
		expect(head.metas.map((m) => m.key)).toEqual(["description", "keywords", "robots"]);
		expect(byKey(head)).toEqual({
			description: "Financez votre projet",
			keywords: "crédit, conso",
			robots: "noindex, nofollow",
		});
		expect(head.metas.every((m) => m.name)).toBe(true);
	});

	it("omet chaque balise dont la valeur est vide plutôt que de la rendre vide", () => {
		const head = build(page());
		expect(head.metas).toEqual([]);
	});

	it("omet robots quand la page porte le mixin sans restriction", () => {
		const head = build(page({ noindex: false, nofollow: false }, [SEO_PAGE_OPTIONS_MIXIN]));
		expect(byKey(head).robots).toBeUndefined();
	});
});

describe("buildHeadMeta — balises sociales", () => {
	const socialPage = (extra: Record<string, PropValue> = {}) =>
		page(
			{
				"jcr:description": "Financez votre projet",
				"activeFacebook": true,
				"urlImgFacebook": image("/files/fb.jpg", 1200, 630),
				...extra,
			},
			[OPEN_GRAPH_TAGS_MIXIN],
		);

	it("ajoute les balises sociales APRÈS les métas SEO", () => {
		const head = build(socialPage());
		expect(head.metas[0]?.key).toBe("description");
		expect(head.metas.slice(1).every((m) => m.key.startsWith("og:"))).toBe(true);
	});

	it("partage la même URL absolue entre canonical et og:url", () => {
		const head = build(socialPage());
		expect(byKey(head)["og:url"]).toBe(head.canonical);
	});

	it("alimente og:title avec le titre résolu et og:site_name avec le nom du site", () => {
		const head = build(socialPage());
		expect(byKey(head)["og:title"]).toBe("Titre de page");
		expect(byKey(head)["og:site_name"]).toBe("Sofinco");
	});
});

describe("buildHeadMeta — locale Open Graph", () => {
	it("déduit le territoire quand la ressource n'a pas de pays", () => {
		const head = build(page({ activeFacebook: true }, [OPEN_GRAPH_TAGS_MIXIN]), {
			language: "fr",
			country: "",
		});
		expect(byKey(head)["og:locale"]).toBe("fr_FR");
	});

	it("compose language_country quand la ressource porte un pays", () => {
		const head = build(page({ activeFacebook: true }, [OPEN_GRAPH_TAGS_MIXIN]), {
			language: "fr",
			country: "BE",
		});
		expect(byKey(head)["og:locale"]).toBe("fr_BE");
	});
});

describe("buildHeadMeta — scope microdata", () => {
	it("déclare le scope schema.org quand des balises itemprop sont émises", () => {
		const head = build(page({ activeGoogle: true }, [OPEN_GRAPH_TAGS_MIXIN]));
		expect(head.microdata).toEqual({ itemScope: true, itemType: "https://schema.org/WebPage" });
	});

	it("ne déclare aucun scope quand seul Facebook est activé", () => {
		const head = build(page({ activeFacebook: true }, [OPEN_GRAPH_TAGS_MIXIN]));
		expect(head.metas.length).toBeGreaterThan(0);
		expect(head.microdata).toEqual({});
	});

	it("ne déclare aucun scope quand la page ne porte pas le mixin social", () => {
		expect(build(page()).microdata).toEqual({});
	});
});

describe("buildHeadMeta — données structurées", () => {
	it("émet le fil d'Ariane dans un @graph unique, en URLs absolues", () => {
		const current = makeNode({
			nodeTypes: ["jnt:page"],
			props: { "jcr:title": "Crédit conso" },
			path: "/sites/sofinco/credit-conso",
			url: "/sites/sofinco/credit-conso.html",
		});

		// Le fil descend du template, qui le rend déjà — il n'est pas reconstruit ici.
		const head = build(current, {
			breadcrumbItems: [
				{
					id: "1",
					label: "Accueil Sofinco",
					url: "/sites/sofinco.html",
					isCurrent: false,
					isClickable: true,
				},
				{
					id: "2",
					label: "Crédit conso",
					url: "/sites/sofinco/credit-conso.html",
					isCurrent: true,
					isClickable: false,
				},
			],
		});
		const graph = JSON.parse(head.jsonLd);

		expect(graph["@context"]).toBe("https://schema.org");
		// Le pivot `WebSite` / `WebPage` précède la navigation : c'est lui qui la relie
		// au reste du document.
		expect(graph["@graph"].map((node: { "@type": string }) => node["@type"])).toEqual([
			"WebSite",
			"WebPage",
			"BreadcrumbList",
		]);
		expect(graph["@graph"][1].breadcrumb).toEqual({ "@id": `${head.canonical}#breadcrumb` });
		expect(graph["@graph"].slice(2)).toEqual([
			{
				"@type": "BreadcrumbList",
				"@id": `${head.canonical}#breadcrumb`,
				"itemListElement": [
					{
						"@type": "ListItem",
						"position": 1,
						"name": "Accueil Sofinco",
						"item": "https://www.sofinco.fr/sites/sofinco.html",
					},
					{
						"@type": "ListItem",
						"position": 2,
						"name": "Crédit conso",
						"item": head.canonical,
					},
				],
			},
		]);
	});

	it("émet le pivot site + page même sans configuration de marque ni contenu balisable", () => {
		// Le pivot ne dépend que du canonical : sans lui les nœuds de contenu
		// flotteraient sans rien qui les relie à la page ni au site.
		const graph = JSON.parse(build(page()).jsonLd)["@graph"];
		expect(graph.map((node: { "@type": string }) => node["@type"])).toEqual(["WebSite", "WebPage"]);
	});

	it("dégrade en balisage absent plutôt qu'en 500 quand le dépôt lève", () => {
		// Le graphe est le seul morceau du `<head>` qui interroge le JCR au-delà de la
		// page courante. Une session indisponible ne doit pas emporter le rendu entier.
		pageContentNodes.mockImplementationOnce(() => {
			throw new Error("JCR session unavailable");
		});

		const head = build(page());
		expect(head.jsonLd).toBe("");
		// Le reste du `<head>` est toujours rendu.
		expect(head.title).toBe("Titre de page");
		expect(head.canonical).toBe("https://www.sofinco.fr/sites/sofinco/credit-conso.html");
	});
});

describe("buildHeadMeta — page non résolvable", () => {
	it("retombe sur le titre de repli et n'émet aucune méta", () => {
		const head = build(null);
		expect(head.title).toBe("Titre de page");
		expect(head.metas).toEqual([]);
		expect(head.microdata).toEqual({});
	});

	it("retombe sur l'URL courante pour le canonical", () => {
		expect(build(null).canonical).toBe("https://www.sofinco.fr/fr/current.html");
	});
});
