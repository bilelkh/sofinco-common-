import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("#lib/cta", () => ({ getRequiredCtaProps: vi.fn(() => ({ label: "CTA" })) }));
vi.mock("../ComparisonOfferFeature/comparisonOfferFeature.mapping", () => ({
	mapComparisonOfferFeature: vi.fn((n: { getIdentifier(): string }) => ({
		id: n.getIdentifier(),
	})),
}));

import { mapComparisonOffer } from "./comparisonOffer.mapping";

const feature = (id: string) => makeNode({ id, nodeTypes: ["sofnt:comparisonOfferFeature"] });

describe("mapComparisonOffer", () => {
	it("maps label, image, background, cta and both feature columns", () => {
		const leftList = makeNode({
			nodeTypes: ["sofnt:comparisonOfferFeatureList"],
			children: [feature("l1"), feature("l2")],
		});
		const rightList = makeNode({
			nodeTypes: ["sofnt:comparisonOfferFeatureList"],
			children: [feature("r1")],
		});
		const node = makeNode({
			id: "offer-1",
			props: {
				"jcr:title": "La carte Pure",
				"illustration": "carte.webp",
				"illustrationAlt": "Carte Pure",
				"backgroundColor": "#D8ECF9",
			},
			named: { leftFeatures: leftList, rightFeatures: rightList },
		});

		expect(mapComparisonOffer(node)).toEqual({
			id: "offer-1",
			label: "La carte Pure",
			image: { src: "carte.webp", alt: "Carte Pure" },
			leftFeatures: [{ id: "l1" }, { id: "l2" }],
			rightFeatures: [{ id: "r1" }],
			backgroundColor: "#D8ECF9",
			cta: { label: "CTA" },
		});
	});

	it("omits the alt when empty and falls back to the default background color", () => {
		const node = makeNode({ id: "offer-2", props: { "jcr:title": "Offre nue" } });
		const mapped = mapComparisonOffer(node);

		expect(mapped.image).toEqual({ src: "", alt: undefined });
		expect(mapped.backgroundColor).toBe("#9FF0EA");
		expect(mapped.leftFeatures).toEqual([]);
		expect(mapped.rightFeatures).toEqual([]);
	});
});
