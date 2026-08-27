import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import { mapProductFocusItem } from "./productFocusItem.mapping";

describe("mapProductFocusItem", () => {
	it("maps id, label and description", () => {
		const node = makeNode({
			id: "item-1",
			props: { "jcr:title": "Montant", description: "De 1 501 € à 10 000 €" },
		});

		expect(mapProductFocusItem(node)).toEqual({
			id: "item-1",
			label: "Montant",
			description: "De 1 501 € à 10 000 €",
		});
	});

	it("`id` comes from node.getIdentifier() (stable React key)", () => {
		const node = makeNode({ id: "custom-uuid" });
		expect(mapProductFocusItem(node).id).toBe("custom-uuid");
	});

	it("falls back to empty strings when nothing is contributed", () => {
		expect(mapProductFocusItem(makeNode({ id: "empty" }))).toEqual({
			id: "empty",
			label: "",
			description: "",
		});
	});

	it("no unexpected keys exposed (strict DS contract)", () => {
		const result = mapProductFocusItem(
			makeNode({ id: "x", props: { "jcr:title": "L", description: "D" } }),
		);
		expect(Object.keys(result).sort()).toEqual(["description", "id", "label"]);
	});
});
