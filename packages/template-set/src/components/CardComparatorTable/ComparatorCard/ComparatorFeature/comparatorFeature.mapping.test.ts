import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import { mapComparatorFeature } from "./comparatorFeature.mapping";

describe("mapComparatorFeature", () => {
	it("maps the label and an explicitly excluded feature", () => {
		const node = makeNode({
			id: "f1",
			props: { label: "Pas de retraits à l'étranger", included: false },
		});

		expect(mapComparatorFeature(node)).toEqual({
			id: "f1",
			label: "Pas de retraits à l'étranger",
			included: false,
		});
	});

	it("defaults `included` to true when not contributed", () => {
		const node = makeNode({ id: "f2", props: { label: "Carte digitale" } });

		expect(mapComparatorFeature(node)).toEqual({
			id: "f2",
			label: "Carte digitale",
			included: true,
		});
	});
});
