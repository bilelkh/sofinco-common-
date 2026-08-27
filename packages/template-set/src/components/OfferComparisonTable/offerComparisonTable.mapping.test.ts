import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("./ComparisonOffer/comparisonOffer.mapping", () => ({
	mapComparisonOffer: vi.fn((n: { getIdentifier(): string }) => ({
		id: n.getIdentifier(),
	})),
}));

import { mapOfferComparisonTableProps } from "./offerComparisonTable.mapping";

const offer = (id: string) => makeNode({ id, nodeTypes: ["sofnt:comparisonOffer"] });

describe("mapOfferComparisonTableProps", () => {
	it("maps the title and every offer in the wrapper list", () => {
		const wrapper = makeNode({
			nodeTypes: ["sofnt:comparisonOfferList"],
			children: [offer("a"), offer("b")],
		});
		const node = makeNode({
			props: { "jcr:title": "Une carte, deux crédits" },
			children: [wrapper],
		});

		expect(mapOfferComparisonTableProps(node)).toEqual({
			title: "Une carte, deux crédits",
			offers: [{ id: "a" }, { id: "b" }],
		});
	});

	it("yields no offers without a wrapper list", () => {
		const node = makeNode({ props: { "jcr:title": "Titre seul" } });

		expect(mapOfferComparisonTableProps(node)).toEqual({
			title: "Titre seul",
			offers: [],
		});
	});
});
