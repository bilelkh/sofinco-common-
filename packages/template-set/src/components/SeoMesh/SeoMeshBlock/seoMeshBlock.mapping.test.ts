import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import { mapSeoMeshBlockPropsServer, mapSeoMeshBlock } from "./seoMeshBlock.mapping";

const section = (id: string, title: string) =>
	makeNode({ id, nodeTypes: ["spnt:seoLinksSubBlock"], props: { subBlockTitle: title } });

describe("seoMeshBlock mappers", () => {
	it("mapSeoMeshBlockPropsServer maps the common props", () => {
		const node = makeNode({
			props: {
				blockTitle: "Bloc",
				blockTitleLevel: "h2",
				blockTitleSize: "lg",
				blockCtaTitle: "Voir",
				blockCtaTarget: "/cta",
				ariaLabel: "aria",
			},
		});
		expect(mapSeoMeshBlockPropsServer(node)).toEqual({
			title: "Bloc",
			titleLevel: "h2",
			titleSize: "lg",
			ctaTitle: "Voir",
			ctaUrl: "/cta",
			ariaLabel: "aria",
		});
	});

	it("mapSeoMeshBlock maps cta + left/right sections (first two sub-blocks)", () => {
		const node = makeNode({
			id: "b1",
			props: { blockTitle: "Bloc", blockCtaTitle: "Voir", blockCtaTarget: "/cta" },
			children: [section("left", "Gauche"), section("right", "Droite")],
		});
		const result = mapSeoMeshBlock(node);
		expect(result.id).toBe("b1");
		expect(result.title).toBe("Bloc");
		expect(result.ctaProps).toEqual({
			type: "button",
			variant: "primary",
			label: "Voir",
			href: "/cta",
		});
		expect(result.linkSectionLeft).toMatchObject({ title: "Gauche" });
		expect(result.linkSectionRight).toMatchObject({ title: "Droite" });
	});

	it("leaves sections undefined and uses '#'/'' fallbacks when absent", () => {
		const result = mapSeoMeshBlock(makeNode({ id: "b" }));
		expect(result.linkSectionLeft).toBeUndefined();
		expect(result.linkSectionRight).toBeUndefined();
		expect(result.ctaProps).toMatchObject({ label: "", href: "#" });
	});
});
