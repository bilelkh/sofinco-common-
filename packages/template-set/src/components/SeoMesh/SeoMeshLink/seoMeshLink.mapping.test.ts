import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import { mapSeoMeshLinkPropsServer, mapSeoMeshLink } from "./seoMeshLink.mapping";

describe("seoMeshLink mappers", () => {
	it("mapSeoMeshLinkPropsServer maps title/url/ariaLabel", () => {
		const node = makeNode({
			props: { subLinkTargetTitle: "Lien", subLinkTarget: "/dest", ariaLabel: "aria" },
		});
		expect(mapSeoMeshLinkPropsServer(node)).toEqual({
			title: "Lien",
			url: "/dest",
			ariaLabel: "aria",
		});
	});

	it("mapSeoMeshLink maps id/href/label with '#' fallback", () => {
		const node = makeNode({
			id: "l1",
			props: { subLinkTargetTitle: "Lien", subLinkTarget: "/dest" },
		});
		expect(mapSeoMeshLink(node)).toEqual({ id: "l1", href: "/dest", label: "Lien" });
		expect(mapSeoMeshLink(makeNode({ id: "l2" }))).toEqual({ id: "l2", href: "#", label: "" });
	});
});
