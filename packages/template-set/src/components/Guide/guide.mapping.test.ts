import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("@jahia/javascript-modules-library", () => ({
	buildNodeUrl: vi.fn((node: { getUrl(): string }) => node.getUrl()),
}));
vi.mock("./GuideCategory/guideCategory.mapping", () => ({
	extractGuideCategories: vi.fn(() => [
		{ id: "cat", title: "C", imageUrl: "", imageAlt: "", links: [] },
	]),
}));

import { mapGuidePropsClient, mapGuidePropsServer } from "./guide.mapping";

describe("guide title size", () => {
	it("defaults to h2 and only accepts h3 as the alternative", () => {
		expect(mapGuidePropsServer(makeNode()).titleSize).toBe("h2");
		expect(mapGuidePropsServer(makeNode({ props: { titleSize: "h3" } })).titleSize).toBe("h3");
		expect(mapGuidePropsServer(makeNode({ props: { titleSize: "h1" } })).titleSize).toBe("h2");
	});
});

describe("guide CTA", () => {
	it("resolves an internal CTA via the linked node URL", () => {
		const target = makeNode({ url: "/dest" });
		const node = makeNode({
			props: {
				"jcr:title": "Guide",
				"linkType": "internal",
				"ctaLabel": "Voir",
				"j:linknode": target,
			},
		});
		expect(mapGuidePropsServer(node)).toMatchObject({ ctaLabel: "Voir", ctaUrl: "/dest" });
	});

	it("falls back to j:url when there is no linked node", () => {
		const node = makeNode({
			props: { "linkType": "external", "ctaLabel": "Voir", "j:url": "https://x" },
		});
		expect(mapGuidePropsServer(node).ctaUrl).toBe("https://x");
	});

	it("omits the CTA when disabled / unlabeled / hrefless", () => {
		expect(mapGuidePropsServer(makeNode({ props: { linkType: "none" } })).ctaUrl).toBeUndefined();
		expect(
			mapGuidePropsServer(makeNode({ props: { linkType: "external" } })).ctaUrl,
		).toBeUndefined();
		expect(
			mapGuidePropsServer(makeNode({ props: { linkType: "external", ctaLabel: "L" } })).ctaUrl,
		).toBeUndefined();
	});
});

describe("mapGuidePropsClient", () => {
	it("adds the categories from the sub-mapper", () => {
		expect(
			mapGuidePropsClient(makeNode({ props: { "jcr:title": "Guide" } })).categories,
		).toHaveLength(1);
	});
});
