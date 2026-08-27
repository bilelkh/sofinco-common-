import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("#shared/Link/readLink", () => ({
	readLink: vi.fn((n: { getIdentifier(): string }) =>
		n.getIdentifier() === "skip"
			? null
			: { label: `L-${n.getIdentifier()}`, href: `/${n.getIdentifier()}` },
	),
}));

import {
	mapGuideCategory,
	mapGuideCategoryServer,
	extractGuideCategories,
} from "./guideCategory.mapping";

describe("mapGuideCategory", () => {
	it("maps category metadata and resolvable links (dropping null links)", () => {
		const okLink = makeNode({ id: "a", nodeTypes: ["sofnt:link"] });
		const skipLink = makeNode({ id: "skip", nodeTypes: ["sofnt:link"] });
		const node = makeNode({
			id: "cat",
			props: {
				"jcr:title": "Catégorie",
				"image": "img.png",
				"imageMobile": "img-mobile.png",
				"imageAlt": "alt",
			},
			children: [okLink, skipLink],
		});
		expect(mapGuideCategory(node)).toEqual({
			id: "cat",
			title: "Catégorie",
			imageUrl: "img.png",
			imageUrlMobile: "img-mobile.png",
			imageAlt: "alt",
			links: [{ id: "a", label: "L-a", url: "/a" }],
		});
	});

	it("returns an empty mobile URL when no mobile visual is picked", () => {
		// Le DS retombe sur `imageUrl` quand `imageUrlMobile` est falsy : la tuile
		// mobile affiche alors le carre desktop plutot que la banniere large.
		const node = makeNode({ id: "cat", props: { image: "img.png" } });
		expect(mapGuideCategory(node).imageUrlMobile).toBe("");
	});
});

describe("mapGuideCategoryServer", () => {
	it("maps the same metadata as mapGuideCategory but omits links", () => {
		// En edit mode les `sofnt:link` sont rendus par Jahia via RenderChildren
		// (pour rester editables), ils ne doivent donc PAS etre mappes en props.
		const link = makeNode({ id: "a", nodeTypes: ["sofnt:link"] });
		const node = makeNode({
			id: "cat",
			props: {
				"jcr:title": "Catégorie",
				"image": "img.png",
				"imageMobile": "img-mobile.png",
				"imageAlt": "alt",
			},
			children: [link],
		});

		expect(mapGuideCategoryServer(node)).toEqual({
			id: "cat",
			title: "Catégorie",
			imageUrl: "img.png",
			imageUrlMobile: "img-mobile.png",
			imageAlt: "alt",
		});
	});

	it("does not expose a links key even when children exist", () => {
		const node = makeNode({
			id: "cat",
			children: [makeNode({ id: "a", nodeTypes: ["sofnt:link"] })],
		});
		expect("links" in mapGuideCategoryServer(node)).toBe(false);
	});

	it("falls back to empty strings when metadata is missing", () => {
		expect(mapGuideCategoryServer(makeNode({ id: "cat" }))).toEqual({
			id: "cat",
			title: "",
			imageUrl: "",
			imageUrlMobile: "",
			imageAlt: "",
		});
	});

	it("stays aligned with mapGuideCategory on every shared field", () => {
		// Garde-fou : si un champ est ajoute a l'un des deux mappers sans etre
		// reporte sur l'autre, ce test echoue.
		const node = makeNode({
			id: "cat",
			props: { "jcr:title": "T", "image": "i.png", "imageMobile": "m.png", "imageAlt": "a" },
			children: [makeNode({ id: "a", nodeTypes: ["sofnt:link"] })],
		});
		const { links, ...sharedFromFullMapper } = mapGuideCategory(node);
		expect(links).toBeDefined();
		expect(mapGuideCategoryServer(node)).toEqual(sharedFromFullMapper);
	});
});

describe("extractGuideCategories", () => {
	it("maps only sofnt:guideCategory children", () => {
		const cat = makeNode({
			id: "c",
			nodeTypes: ["sofnt:guideCategory"],
			props: { "jcr:title": "C" },
		});
		const other = makeNode({ id: "o", nodeTypes: ["sofnt:other"] });
		const parent = makeNode({ children: [cat, other] });
		expect(extractGuideCategories(parent)).toHaveLength(1);
	});
});
