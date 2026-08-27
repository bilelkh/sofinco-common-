import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("./ProductAdvantageCategory/productAdvantageCategory.mapping", () => ({
	mapProductAdvantageCategory: vi.fn((n: { getIdentifier(): string }) => ({
		id: n.getIdentifier(),
	})),
}));

import { mapProductAdvantagesProps } from "./productAdvantages.mapping";

const category = (id: string) => makeNode({ id, nodeTypes: ["sofnt:productAdvantageCategory"] });

describe("mapProductAdvantagesProps", () => {
	it("maps the title, subtitle and every category in the wrapper list", () => {
		const wrapper = makeNode({
			nodeTypes: ["sofnt:productAdvantageCategoryList"],
			children: [category("a"), category("b"), category("c")],
		});
		const node = makeNode({
			props: { "jcr:title": "Pas n'importe quelle carte", "subtitle": "Découvrez tout." },
			children: [wrapper],
		});

		expect(mapProductAdvantagesProps(node)).toEqual({
			title: "Pas n'importe quelle carte",
			subtitle: "Découvrez tout.",
			categories: [{ id: "a" }, { id: "b" }, { id: "c" }],
		});
	});

	it("omits the subtitle when not contributed and yields no categories without a list", () => {
		const node = makeNode({ props: { "jcr:title": "Titre seul" } });

		expect(mapProductAdvantagesProps(node)).toEqual({
			title: "Titre seul",
			subtitle: undefined,
			categories: [],
		});
	});
});
