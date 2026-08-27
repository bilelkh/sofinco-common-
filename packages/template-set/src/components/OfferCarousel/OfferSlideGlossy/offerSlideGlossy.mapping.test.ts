import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("#lib/cta", () => ({ getRequiredCtaProps: vi.fn(() => ({ label: "CTA", href: "/x" })) }));

import { mapOfferSlideGlossyProps } from "./offerSlideGlossy.mapping";

describe("mapOfferSlideGlossyProps", () => {
	it("maps a glossy slide with a required CTA", () => {
		const node = makeNode({
			id: "g1",
			props: { "jcr:title": "T", "description": "D", "imgMobile": "m.png", "imgDesktop": "d.png" },
		});
		expect(mapOfferSlideGlossyProps(node)).toEqual({
			variant: "glossy",
			id: "g1",
			title: "T",
			description: "D",
			imgMobile: "m.png",
			imgDesktop: "d.png",
			cta: { label: "CTA", href: "/x" },
		});
	});
});
