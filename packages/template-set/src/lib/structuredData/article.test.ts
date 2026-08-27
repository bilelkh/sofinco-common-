import { describe, it, expect, vi } from "vitest";
import { makeNode, type PropValue } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("#lib/cacheDependency", () => ({
	addDirectChildrenCacheDependency: vi.fn(),
	addNodeCacheDependency: vi.fn(),
	addSubtreeCacheDependency: vi.fn(),
}));

import { buildArticle } from "./article";

const ORIGIN = "https://www.sofinco.fr";
const CANONICAL = "https://www.sofinco.fr/actualite-credit/bonus-malus-ecologique";
const INPUT = {
	origin: ORIGIN,
	canonical: CANONICAL,
	id: `${CANONICAL}#article`,
	authorName: "La Rédaction Sofinco",
	inLanguage: "fr",
	publisher: { "@id": `${ORIGIN}/#organization` },
};

const news = (props: Record<string, PropValue> = {}) =>
	makeNode({
		nodeTypes: ["spnt:news"],
		props: {
			"title": "Tout savoir sur le bonus-malus écologique",
			"description": "Ce qui change en 2026.",
			"picture": makeNode({ url: "/files/actu.png", props: { "j:width": 1200, "j:height": 675 } }),
			// Minuit LOCAL, comme le produit le sélecteur de date de Jahia. Un
			// `Date.UTC(...)` ici passerait dans tous les fuseaux et ne dirait donc rien
			// du décalage d'un jour que `getDate().iso` doit éviter.
			"publishDate": { __millis: new Date(2026, 1, 18).getTime() },
			"jcr:lastModified": { __millis: new Date(2026, 2, 4).getTime() },
			...props,
		},
	});

describe("buildArticle", () => {
	it("construit l'article avec des dates ISO 8601 et une image absolue", () => {
		expect(buildArticle(news(), INPUT)).toEqual({
			"@type": "Article",
			"@id": `${CANONICAL}#article`,
			"mainEntityOfPage": { "@id": CANONICAL },
			"headline": "Tout savoir sur le bonus-malus écologique",
			"description": "Ce qui change en 2026.",
			"image": {
				"@type": "ImageObject",
				"url": "https://www.sofinco.fr/files/actu.png",
				"width": 1200,
				"height": 675,
			},
			"inLanguage": "fr",
			"author": { "@type": "Organization", "name": "La Rédaction Sofinco" },
			"publisher": { "@id": `${ORIGIN}/#organization` },
			"datePublished": "2026-02-18",
			"dateModified": "2026-03-04",
		});
	});

	it("retombe sur jcr:title quand le titre dédié est absent", () => {
		const node = makeNode({
			nodeTypes: ["spnt:news"],
			props: {
				"jcr:title": "Titre de repli",
				"publishDate": { __millis: new Date(2026, 0, 5).getTime() },
			},
		});
		expect(buildArticle(node, INPUT)?.headline).toBe("Titre de repli");
	});

	it("retombe sur la date de publication quand la date de modification manque", () => {
		const node = news({ "jcr:lastModified": undefined as unknown as PropValue });
		expect(buildArticle(node, INPUT)?.dateModified).toBe("2026-02-18");
	});

	it("omet description et image plutôt que de les émettre vides", () => {
		const node = makeNode({
			nodeTypes: ["spnt:news"],
			props: { title: "Actu", publishDate: { __millis: new Date(2026, 0, 5).getTime() } },
		});
		const article = buildArticle(node, INPUT);
		expect(article?.description).toBeUndefined();
		expect(article?.image).toBeUndefined();
	});

	it("renvoie à la marque plutôt que d'émettre une organisation anonyme sans rédaction", () => {
		expect(buildArticle(news(), { ...INPUT, authorName: "" })?.author).toEqual(INPUT.publisher);
	});

	it("omet publisher et author quand l'Organization n'est pas dans le graphe", () => {
		const article = buildArticle(news(), { ...INPUT, authorName: "", publisher: undefined });
		expect(article?.publisher).toBeUndefined();
		expect(article?.author).toBeUndefined();
	});

	it("n'émet rien sans nœud d'actualité ni sans titre", () => {
		expect(buildArticle(null, INPUT)).toBeNull();
		expect(buildArticle(makeNode({ nodeTypes: ["spnt:news"] }), INPUT)).toBeNull();
	});
});
