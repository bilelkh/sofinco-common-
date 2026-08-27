import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import { mapSeoMeshWrapperPropsServer, mapSeoMeshProps } from "./seoMeshWrapper.mapping";

describe("seoMeshWrapper mappers", () => {
	it("mapSeoMeshWrapperPropsServer maps props with section/link defaults", () => {
		expect(
			mapSeoMeshWrapperPropsServer(
				makeNode({ props: { "jcr:title": "SEO", "backgroundColor": "white" } }),
			),
		).toEqual({
			title: "SEO",
			backgroundColor: "white",
			maxSections: 2,
			maxLinksPerSection: 6,
		});
	});

	it("honours explicit maxSections / maxLinksPerSection", () => {
		const node = makeNode({ props: { maxSections: 3, maxLinksPerSection: 10 } });
		const result = mapSeoMeshWrapperPropsServer(node);
		expect(result.maxSections).toBe(3);
		expect(result.maxLinksPerSection).toBe(10);
	});

	it("mapSeoMeshProps embeds the seoLinksBlock children", () => {
		const block = makeNode({
			id: "blk",
			nodeTypes: ["spnt:seoLinksBlock"],
			props: { blockTitle: "Bloc" },
		});
		const node = makeNode({ props: { "jcr:title": "SEO" }, children: [block] });
		const result = mapSeoMeshProps(node);
		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]).toMatchObject({ id: "blk", title: "Bloc" });
	});
});
