import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import { mapComparisonOfferFeature } from "./comparisonOfferFeature.mapping";

describe("mapComparisonOfferFeature", () => {
	it("maps the tag label and text", () => {
		const node = makeNode({
			id: "f1",
			props: { "jcr:title": "CARTE", "text": "Payez en 3 fois sans frais." },
		});

		expect(mapComparisonOfferFeature(node)).toEqual({
			id: "f1",
			label: "CARTE",
			text: "Payez en 3 fois sans frais.",
		});
	});

	it("falls back to empty strings when nothing is contributed", () => {
		expect(mapComparisonOfferFeature(makeNode({ id: "f2" }))).toEqual({
			id: "f2",
			label: "",
			text: "",
		});
	});
});
