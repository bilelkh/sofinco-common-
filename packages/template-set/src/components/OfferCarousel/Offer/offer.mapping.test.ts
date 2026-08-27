import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("../OfferSlideGlossy/offerSlideGlossy.mapping", () => ({
	mapOfferSlideGlossyProps: vi.fn((n: { getIdentifier(): string }) => ({
		variant: "glossy",
		id: n.getIdentifier(),
	})),
}));
vi.mock("../OfferSlideColored/offerSlideColored.mapping", () => ({
	mapOfferSlideColoredProps: vi.fn((n: { getIdentifier(): string }) => ({
		variant: "colored",
		id: n.getIdentifier(),
	})),
}));
vi.mock("../OfferSlideRate/offerSlideRate.mapping", () => ({
	mapOfferSlideRateProps: vi.fn((n: { getIdentifier(): string }) => ({
		variant: "rate",
		id: n.getIdentifier(),
	})),
}));

import { mapOfferProps, mapOfferSlide } from "./offer.mapping";

const slide = (id: string, type: string) =>
	makeNode({ id, nodeTypes: ["sofmix:offerSlide", type] });

describe("mapOfferSlide", () => {
	it("dispatches by node type", () => {
		expect(mapOfferSlide(slide("a", "sofnt:offerSlideGlossy"))).toEqual({
			variant: "glossy",
			id: "a",
		});
		expect(mapOfferSlide(slide("b", "sofnt:offerSlideColored"))).toEqual({
			variant: "colored",
			id: "b",
		});
		expect(mapOfferSlide(slide("c", "sofnt:offerSlideRate"))).toEqual({ variant: "rate", id: "c" });
	});

	it("throws on an unknown slide variant", () => {
		expect(() =>
			mapOfferSlide(makeNode({ id: "x", path: "/bad", nodeTypes: ["sofmix:offerSlide"] })),
		).toThrow(/Unknown offer slide variant/);
	});
});

describe("mapOfferProps", () => {
	it("maps every slide in the offer-slide list wrapper", () => {
		const wrapper = makeNode({
			nodeTypes: ["sofnt:offerSlideList"],
			children: [slide("a", "sofnt:offerSlideGlossy"), slide("b", "sofnt:offerSlideRate")],
		});
		const node = makeNode({ children: [wrapper] });
		expect(mapOfferProps(node).slides).toEqual([
			{ variant: "glossy", id: "a" },
			{ variant: "rate", id: "b" },
		]);
	});
});
