import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("./ComparatorCard/comparatorCard.mapping", () => ({
	mapComparatorCard: vi.fn((n: { getIdentifier(): string }) => ({ id: n.getIdentifier() })),
}));

import { mapCardComparatorTableProps } from "./cardComparatorTable.mapping";

const card = (id: string) => makeNode({ id, nodeTypes: ["sofnt:comparatorCard"] });

describe("mapCardComparatorTableProps", () => {
	it("maps the title, subtitle and every card in the wrapper list", () => {
		const wrapper = makeNode({
			nodeTypes: ["sofnt:comparatorCardList"],
			children: [card("a"), card("b"), card("c")],
		});
		const node = makeNode({
			props: {
				"jcr:title": "Trouvez la carte faite pour vous",
				"subtitle": "Trois niveaux, les mêmes fondamentaux.",
			},
			children: [wrapper],
		});

		expect(mapCardComparatorTableProps(node)).toEqual({
			title: "Trouvez la carte faite pour vous",
			subtitle: "Trois niveaux, les mêmes fondamentaux.",
			items: [{ id: "a" }, { id: "b" }, { id: "c" }],
		});
	});

	it("omits blank heading fields and yields no items without a list", () => {
		const node = makeNode({});

		expect(mapCardComparatorTableProps(node)).toEqual({
			title: undefined,
			subtitle: undefined,
			items: [],
		});
	});
});
