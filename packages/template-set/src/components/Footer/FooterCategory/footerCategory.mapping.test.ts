import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("../FooterLink/footerLink.mapping", () => ({
	mapFooterLinkPropsClient: vi.fn((node: { getIdentifier(): string }) => ({
		label: node.getIdentifier(),
		href: "/x",
	})),
}));

import {
	mapFooterCategoryPropsClient,
	mapFooterCategoryPropsServer,
} from "./footerCategory.mapping";

describe("mapFooterCategoryPropsClient", () => {
	it("maps the title and the child footer links", () => {
		const l1 = makeNode({ id: "l1", nodeTypes: ["sofnt:footerLink"] });
		const l2 = makeNode({ id: "l2", nodeTypes: ["sofnt:footerLink"] });
		const node = makeNode({ id: "cat-1", props: { "jcr:title": "Catégorie" }, children: [l1, l2] });

		expect(mapFooterCategoryPropsClient(node)).toEqual({
			id: "cat-1",
			title: "Catégorie",
			links: [
				{ label: "l1", href: "/x" },
				{ label: "l2", href: "/x" },
			],
		});
	});

	it("defaults the title when missing", () => {
		expect(mapFooterCategoryPropsClient(makeNode()).title).toBe("Nouvelle catégorie");
	});
});

describe("mapFooterCategoryPropsServer", () => {
	it("returns only the title", () => {
		expect(
			mapFooterCategoryPropsServer(makeNode({ id: "cat-2", props: { "jcr:title": "C" } })),
		).toEqual({
			id: "cat-2",
			title: "C",
		});
	});
});
