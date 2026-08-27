import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeNode, type PropValue } from "#test/jahia";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import type { BreadcrumbItem } from "sofinco-react";

/**
 * `graph.ts` est la couche de PLOMBERIE : résolution des nœuds JCR, drapeaux de
 * page, ordre du graphe. Les builders qu'elle appelle tournent pour de vrai (leur
 * forme est déjà couverte par leurs propres tests) ; seuls les accès au dépôt sont
 * simulés.
 */

const settingsNode = vi.fn<() => JCRNodeWrapper | null>(() => null);
/** `sofnt:avisClientsSettings` — porte l'interrupteur global du sticker d'avis. */
const avisSettingsNode = vi.fn<() => JCRNodeWrapper | null>(() => null);
vi.mock("#lib/jcr", async () => ({
	...(await import("#test/jahia")),
	// Deux nœuds de settings distincts sont lus sous `contents/site-settings` : le mock
	// doit discriminer, sinon la garde de visibilité lirait `isGlobalActive` sur le
	// nœud des données structurées et ne verrait jamais le sticker actif.
	getGlobalSettingsNode: (configNodeName: string) =>
		configNodeName === "avis-clients-settings" ? avisSettingsNode() : settingsNode(),
}));

vi.mock("#lib/renderContext", () => ({
	addCacheDependency: vi.fn(),
	isEditMode: () => false,
}));

const pageContent = vi.fn<(page: unknown, type: string) => JCRNodeWrapper[]>(() => []);
vi.mock("./pageContent", () => ({
	findPageContent: (page: unknown, type: string) => pageContent(page, type),
}));

const getAverageRate = vi.fn<() => { average: number; nbReview: number } | null>(() => null);
const reviewBridge = vi.fn<() => { getAverageRate: typeof getAverageRate } | null>(() => ({
	getAverageRate,
}));
vi.mock("#lib/javaBridge", () => ({ getReviewServiceBridge: () => reviewBridge() }));

import { buildStructuredDataGraph, serializeJsonLd, STRUCTURED_DATA_OPTIONS_MIXIN } from "./graph";
import type { JsonLdNode } from "./types";
import { LOAN_PRODUCT_SCHEMA_MIXIN } from "./loanOrCredit";

const ORIGIN = "https://www.sofinco.fr";
const CANONICAL = "https://www.sofinco.fr/credit-pret/pret-personnel";

const reviewConfig = makeNode({ nodeTypes: ["spnt:configVerifedReview"] });
const site = makeNode({
	nodeTypes: ["jnt:virtualsite"],
	named: { "contents/config/avis-verifies/config": reviewConfig },
});

const page = (props: Record<string, PropValue> = {}, mixins: string[] = []) =>
	makeNode({ nodeTypes: ["jnt:page", ...mixins], path: "/sites/sofinco/pret-personnel", props });

const build = (pageNode: JCRNodeWrapper | null, over: Record<string, unknown> = {}) =>
	buildStructuredDataGraph({
		renderContext: { getSite: () => site } as unknown as RenderContext,
		pageNode,
		origin: ORIGIN,
		canonical: CANONICAL,
		breadcrumbItems: [] as BreadcrumbItem[],
		title: "Prêt personnel",
		description: "Financez tous vos projets.",
		language: "fr",
		siteName: "Sofinco",
		...over,
	});

const types = (nodes: { "@type": string | string[] }[]) => nodes.map((n) => n["@type"]);
const byType = (nodes: JsonLdNode[], type: string) => nodes.find((n) => n["@type"] === type);

const withSettings = (props: Record<string, PropValue> = {}) =>
	settingsNode.mockReturnValue(
		makeNode({
			nodeTypes: ["sofnt:structuredDataSettings"],
			props: { legalName: "Sofinco", ...props },
		}),
	);

/** Sticker d'avis du pied de page, actif ou éteint pour tout le site. */
const withAvisSticker = (isGlobalActive: boolean) =>
	avisSettingsNode.mockReturnValue(
		makeNode({ nodeTypes: ["sofnt:avisClientsSettings"], props: { isGlobalActive } }),
	);

beforeEach(() => {
	settingsNode.mockReset();
	settingsNode.mockReturnValue(null);
	avisSettingsNode.mockReset();
	// Défaut réaliste : `avisClients` est `mandatory autocreated` sous `sofnt:footer` et
	// `isGlobalActive` vaut `true` dans le CND — le sticker est donc rendu partout.
	withAvisSticker(true);
	pageContent.mockReset();
	pageContent.mockReturnValue([]);
	getAverageRate.mockReset();
	getAverageRate.mockReturnValue({ average: 4.6, nbReview: 12480 });
	reviewBridge.mockReset();
	reviewBridge.mockReturnValue({ getAverageRate });
});

describe("buildStructuredDataGraph — ordre et composition", () => {
	it("ordonne le graphe : marque, site, pivot de page, navigation, puis contenus", () => {
		withSettings();
		const breadcrumbItems: BreadcrumbItem[] = [
			{ id: "1", label: "Accueil", url: "/", isCurrent: false, isClickable: true },
			{ id: "2", label: "Prêt", url: "/pret", isCurrent: true, isClickable: false },
		];
		pageContent.mockImplementation((_page, type) => {
			if (type === "sofnt:faq") {
				return [
					makeNode({
						nodeTypes: ["sofnt:faq"],
						children: [
							makeNode({
								nodeTypes: ["sofnt:faqItem"],
								props: { "jcr:title": "Q", "answer": "R" },
							}),
						],
					}),
				];
			}
			return [];
		});

		expect(
			types(
				build(page({ loanType: "Prêt personnel" }, [LOAN_PRODUCT_SCHEMA_MIXIN]), {
					breadcrumbItems,
				}),
			),
		).toEqual(["Organization", "WebSite", "WebPage", "BreadcrumbList", "FAQPage", "LoanOrCredit"]);
	});

	it("ne balise pas de fil d'Ariane quand le template n'en rend pas", () => {
		withSettings();
		expect(types(build(page()))).not.toContain("BreadcrumbList");
	});

	it("ancre chaque nœud de page sur le canonical", () => {
		withSettings();
		const nodes = build(page({ loanType: "Prêt personnel" }, [LOAN_PRODUCT_SCHEMA_MIXIN]));
		expect(byType(nodes, "LoanOrCredit")?.["@id"]).toBe(`${CANONICAL}#loan`);
		expect(nodes[0]["@id"]).toBe(`${ORIGIN}/#organization`);
	});

	it("relie publisher et provider à l'Organization du même document", () => {
		withSettings();
		const nodes = build(page({ loanType: "Prêt personnel" }, [LOAN_PRODUCT_SCHEMA_MIXIN]));
		expect(byType(nodes, "LoanOrCredit")?.provider).toEqual({
			"@id": `${ORIGIN}/#organization`,
		});
		expect(byType(nodes, "WebSite")?.publisher).toEqual({ "@id": `${ORIGIN}/#organization` });
	});

	it("rattache le pivot WebPage au site et au fil d'Ariane du même document", () => {
		// C'est le nœud qui manquait : `Article.mainEntityOfPage` renvoyait à un
		// `WebPage` absent du graphe, et rien ne reliait entre eux le fil d'Ariane,
		// l'article et la FAQ.
		withSettings();
		const breadcrumbItems: BreadcrumbItem[] = [
			{ id: "1", label: "Accueil", url: "/", isCurrent: false, isClickable: true },
			{ id: "2", label: "Prêt", url: "/pret", isCurrent: true, isClickable: false },
		];
		const webPage = byType(build(page(), { breadcrumbItems }), "WebPage");
		expect(webPage?.["@id"]).toBe(CANONICAL);
		expect(webPage?.isPartOf).toEqual({ "@id": `${ORIGIN}/#website` });
		expect(webPage?.breadcrumb).toEqual({ "@id": `${CANONICAL}#breadcrumb` });
		expect(webPage?.inLanguage).toBe("fr");
	});

	it("ne renvoie pas à un fil d'Ariane que la page ne balise pas", () => {
		withSettings();
		expect(byType(build(page()), "WebPage")?.breadcrumb).toBeUndefined();
	});

	it("émet au minimum le site et le pivot de page, même sans configuration", () => {
		// L'`Organization` demande le nœud de settings, mais le pivot ne dépend que du
		// canonical : sans lui les nœuds de contenu flotteraient de nouveau.
		expect(types(build(page()))).toEqual(["WebSite", "WebPage"]);
	});

	it("n'émet aucun balisage sans URL publique résolue", () => {
		// `resolvePageUrl` peut rendre `""` : on produirait alors des ancres relatives
		// (`"@id": "#article"`) et un `organizationId("")` valant `/#organization`,
		// c'est-à-dire un graphe qui prétend décrire n'importe quel domaine.
		withSettings();
		expect(build(page(), { canonical: "" })).toEqual([]);
		expect(build(page(), { origin: "" })).toEqual([]);
	});

	it("n'émet aucun renvoi vers l'Organization quand celle-ci est absente du graphe", () => {
		// Cas réel tant que `structured-data-settings` n'est pas publié en `live` :
		// l'`Organization` n'est pas construite, donc `publisher` et `provider` ne
		// doivent PAS pointer sur un `@id` inexistant — Google rejetterait l'`Article`
		// entier (« Missing field publisher.name »).
		settingsNode.mockReturnValue(null);
		pageContent.mockImplementation((_page, type) =>
			type === "spnt:news"
				? [
						makeNode({
							nodeTypes: ["spnt:news"],
							props: { title: "Actu", publishDate: { __millis: new Date(2026, 1, 18).getTime() } },
						}),
					]
				: [],
		);

		const nodes = build(page({ loanType: "Prêt personnel" }, [LOAN_PRODUCT_SCHEMA_MIXIN]));
		expect(types(nodes)).toEqual(["WebSite", "WebPage", "Article", "LoanOrCredit"]);

		// Assertion sur le JSON RÉELLEMENT émis : c'est `JSON.stringify` qui retire les
		// clés `undefined`, donc c'est là que se vérifie l'absence du renvoi.
		const graph: Record<string, unknown>[] = JSON.parse(serializeJsonLd(nodes))["@graph"];
		const emitted = (type: string) => graph.find((n) => n["@type"] === type)!;
		expect(emitted("Article")).not.toHaveProperty("publisher");
		// Sans nom de rédaction configuré non plus, `author` disparaît plutôt que de
		// déclarer une organisation anonyme.
		expect(emitted("Article")).not.toHaveProperty("author");
		expect(emitted("LoanOrCredit")).not.toHaveProperty("provider");
		expect(emitted("WebSite")).not.toHaveProperty("publisher");
	});
});

describe("buildStructuredDataGraph — drapeaux par page", () => {
	const faqPageNode = (props: Record<string, PropValue>) =>
		page(props, [STRUCTURED_DATA_OPTIONS_MIXIN]);

	beforeEach(() => {
		pageContent.mockImplementation((_page, type) =>
			type === "sofnt:faq"
				? [
						makeNode({
							nodeTypes: ["sofnt:faq"],
							children: [
								makeNode({
									nodeTypes: ["sofnt:faqItem"],
									props: { "jcr:title": "Q", "answer": "R" },
								}),
							],
						}),
					]
				: [],
		);
	});

	it("émet la FAQ par défaut", () => {
		expect(types(build(page()))).toContain("FAQPage");
	});

	it("respecte disableFaqSchema et n'interroge plus le dépôt", () => {
		expect(types(build(faqPageNode({ disableFaqSchema: true })))).not.toContain("FAQPage");
		expect(pageContent).not.toHaveBeenCalledWith(expect.anything(), "sofnt:faq");
	});

	it("respecte disableArticleSchema et disableVideoSchema", () => {
		build(faqPageNode({ disableArticleSchema: true, disableVideoSchema: true }));
		expect(pageContent).not.toHaveBeenCalledWith(expect.anything(), "spnt:news");
		expect(pageContent).not.toHaveBeenCalledWith(expect.anything(), "sofnt:videoBlock");
	});
});

describe("buildStructuredDataGraph — note client (Avis Vérifiés)", () => {
	const ratedPage = (props: Record<string, PropValue> = {}) =>
		page({ enableAggregateRating: true, ...props }, [STRUCTURED_DATA_OPTIONS_MIXIN]);

	const rating = (nodes: JsonLdNode[]) =>
		nodes.find((n) => n.aggregateRating)?.aggregateRating as JsonLdNode | undefined;

	beforeEach(() => {
		withSettings();
		pageContent.mockImplementation((_page, type) =>
			type === "sofnt:faq"
				? [
						makeNode({
							nodeTypes: ["sofnt:faq"],
							children: [
								makeNode({
									nodeTypes: ["sofnt:faqItem"],
									props: { "jcr:title": "Q", "answer": "R" },
								}),
							],
						}),
					]
				: [],
		);
	});

	it("n'émet aucune note ET n'interroge pas le service tant que la page ne l'a pas activée", () => {
		// La garde de perf : `getAverageRate` sort du JCR pour appeler Avis Vérifiés.
		// Elle se teste, elle ne se suppose pas.
		const nodes = build(page());
		expect(rating(nodes)).toBeUndefined();
		expect(getAverageRate).not.toHaveBeenCalled();
	});

	it("n'émet aucune note quand le drapeau est explicitement à faux", () => {
		const nodes = build(page({ enableAggregateRating: false }, [STRUCTURED_DATA_OPTIONS_MIXIN]));
		expect(rating(nodes)).toBeUndefined();
		expect(getAverageRate).not.toHaveBeenCalled();
	});

	it("greffe la note sur la FAQ d'une page FAQ", () => {
		const nodes = build(ratedPage());
		expect(byType(nodes, "FAQPage")?.aggregateRating).toEqual({
			"@type": "AggregateRating",
			"ratingValue": 4.6,
			"reviewCount": 12480,
			"bestRating": 5,
			"worstRating": 1,
		});
	});

	it("greffe la note sur LoanOrCredit quand la page décrit une offre", () => {
		const nodes = build(
			page({ enableAggregateRating: true, loanType: "Prêt personnel" }, [
				STRUCTURED_DATA_OPTIONS_MIXIN,
				LOAN_PRODUCT_SCHEMA_MIXIN,
			]),
		);
		expect(byType(nodes, "LoanOrCredit")?.aggregateRating).toBeDefined();
		expect(byType(nodes, "FAQPage")?.aggregateRating).toBeUndefined();
	});

	it("ne greffe la note que sur un seul nœud", () => {
		expect(build(ratedPage()).filter((n) => n.aggregateRating)).toHaveLength(1);
	});

	it("laisse le graphe intact quand le pont OSGi est absent", () => {
		reviewBridge.mockReturnValue(null);
		const nodes = build(ratedPage());
		expect(rating(nodes)).toBeUndefined();
		expect(types(nodes)).toContain("FAQPage");
	});

	it("n'émet rien sous les seuils réglés sur le nœud de settings", () => {
		withSettings({ ratingMinValue: 4.8 });
		expect(rating(build(ratedPage()))).toBeUndefined();

		withSettings({ ratingMinReviewCount: 99999 });
		expect(rating(build(ratedPage()))).toBeUndefined();
	});

	it("n'émet jamais la note sur l'entité de marque", () => {
		// La position du balisage est ce que juge la policy Google sur les avis
		// auto-attribués : `Organization` ne doit jamais la porter.
		expect(byType(build(ratedPage()), "Organization")?.aggregateRating).toBeUndefined();
	});

	it("émet la note sur une page qui ne porte aucun bloc d'avis", () => {
		// Arbitrage métier : la note est GLOBALE au site, elle s'active donc où le
		// référencement le décide — page produit comprise. Ce test verrouille l'absence
		// de garde par contenu de page contre une réintroduction.
		pageContent.mockReturnValue([]);
		expect(rating(build(ratedPage()))).toBeDefined();
	});

	it("n'émet aucune note quand le sticker d'avis est éteint pour tout le site", () => {
		// Seul état où plus AUCUNE page n'affiche la note : la baliser exposerait alors
		// à une action manuelle pour balisage non visible.
		withAvisSticker(false);
		const nodes = build(ratedPage());
		expect(rating(nodes)).toBeUndefined();
		expect(getAverageRate).not.toHaveBeenCalled();
		expect(types(nodes)).toContain("FAQPage");
	});

	it("n'émet aucune note quand le nœud de config Avis Vérifiés est absent", () => {
		// Site sans `contents/config/avis-verifies/config` : le script avis-verifie.groovy
		// n'a pas tourné. Seul chemin de dégradation non couvert.
		const siteSansConfig = makeNode({ nodeTypes: ["jnt:virtualsite"] });
		const nodes = build(ratedPage(), { renderContext: { getSite: () => siteSansConfig } });
		expect(rating(nodes)).toBeUndefined();
		expect(getAverageRate).not.toHaveBeenCalled();
	});

	it("n'interroge le service qu'une seule fois par rendu", () => {
		build(ratedPage());
		expect(getAverageRate).toHaveBeenCalledTimes(1);
	});
});

describe("serializeJsonLd", () => {
	it("émet un unique @context et un @graph", () => {
		const json = JSON.parse(serializeJsonLd([{ "@type": "Organization", "name": "Sofinco" }]));
		expect(json).toEqual({
			"@context": "https://schema.org",
			"@graph": [{ "@type": "Organization", "name": "Sofinco" }],
		});
	});

	it("neutralise une balise de fermeture de script saisie par un contributeur", () => {
		const payload = serializeJsonLd([
			{ "@type": "Answer", "text": "Avant </script><script>alert(1)</script> après" },
		]);
		expect(payload).not.toContain("</script>");
		// Le contenu reste intact une fois relu — l'échappement est réversible.
		expect(JSON.parse(payload)["@graph"][0].text).toBe(
			"Avant </script><script>alert(1)</script> après",
		);
	});

	it("ne rend rien pour un graphe vide", () => {
		expect(serializeJsonLd([])).toBe("");
	});
});
