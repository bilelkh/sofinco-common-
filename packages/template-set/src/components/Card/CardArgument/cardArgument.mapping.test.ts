import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import { mapCardArgumentProps } from "./cardArgument.mapping";

describe("mapCardArgumentProps", () => {
	it("maps id, title and description", () => {
		const node = makeNode({ id: "arg-1", props: { "jcr:title": "Titre", "description": "Desc" } });
		expect(mapCardArgumentProps(node)).toEqual({
			id: "arg-1",
			title: "Titre",
			description: "Desc",
		});
	});

	it("falls back to empty strings when properties are missing", () => {
		expect(mapCardArgumentProps(makeNode({ id: "x" }))).toEqual({
			id: "x",
			title: "",
			description: "",
		});
	});
});
