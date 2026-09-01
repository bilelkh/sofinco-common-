import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import { mapSeoMeshSectionPropsServer, mapSeoMeshSection } from "./seoMeshSection.mapping";

const link = (id: string, title: string) =>
	makeNode({
		id,
		nodeTypes: ["spnt:seoLinksSubBlockLink"],
		props: { subLinkTargetTitle: title, subLinkTarget: `/${id}` },
	});

describe("seoMeshSection mappers", () => {
	it("mapSeoMeshSectionPropsServer maps title and level", () => {
		const node = makeNode({ props: { subBlockTitle: "Section", subBlockLevel: "h3" } });
		expect(mapSeoMeshSectionPropsServer(node)).toEqual({ title: "Section", level: "h3" });
	});

	it("mapSeoMeshSection maps title and child links", () => {
		const node = makeNode({
			props: { subBlockTitle: "Section" },
			children: [link("a", "A"), link("b", "B")],
		});
		expect(mapSeoMeshSection(node)).toEqual({
			title: "Section",
			// `subBlockLevel` absent → repli h3, le niveau que le composant codait en dur.
			titleAs: "h3",
			links: [
				{ id: "a", href: "/a", label: "A" },
				{ id: "b", href: "/b", label: "B" },
			],
		});
	});
});
