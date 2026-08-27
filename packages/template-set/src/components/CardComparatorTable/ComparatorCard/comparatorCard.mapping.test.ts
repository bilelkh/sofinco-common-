import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("#lib/cta", () => ({
	getRequiredCtaProps: vi.fn((node: { __props?: Record<string, unknown> }, ctaSection: string) => ({
		label: (node.__props?.ctaLabel as string) ?? "En savoir plus",
		href: "/cta-target",
		target: (node.__props?.ctaTarget as string) ?? "_self",
		ctaSection,
		variant: "accent",
	})),
}));
vi.mock("./ComparatorFeature/comparatorFeature.mapping", () => ({
	mapComparatorFeature: vi.fn((n: { getIdentifier(): string }) => ({ id: n.getIdentifier() })),
}));

import { mapComparatorCard } from "./comparatorCard.mapping";

const feature = (id: string) => makeNode({ id, nodeTypes: ["sofnt:comparatorFeature"] });

describe("mapComparatorCard", () => {
	it("maps every field and walks the feature wrapper list", () => {
		const wrapper = makeNode({
			nodeTypes: ["sofnt:comparatorFeatureList"],
			children: [feature("a"), feature("b")],
		});
		const node = makeNode({
			id: "card-1",
			props: {
				"jcr:title": "Pure",
				"description": "La carte du quotidien.",
				"image": "/files/card.webp",
				"badgeLabel": "Nouveauté",
				"ctaLabel": "Obtenir la carte",
				"ctaTarget": "_blank",
			},
			children: [wrapper],
		});

		expect(mapComparatorCard(node)).toEqual({
			id: "card-1",
			image: "/files/card.webp",
			title: "Pure",
			description: "La carte du quotidien.",
			features: [{ id: "a" }, { id: "b" }],
			cta: {
				label: "Obtenir la carte",
				href: "/cta-target",
				target: "_blank",
				ctaSection: "card-comparator-table-cta",
			},
			badgeLabel: "Nouveauté",
		});
	});

	it("omits the badge, defaults the CTA target and yields no features without a list", () => {
		const node = makeNode({
			id: "card-2",
			props: { "jcr:title": "Origin", "description": "L'essentiel." },
		});

		expect(mapComparatorCard(node)).toEqual({
			id: "card-2",
			image: "",
			title: "Origin",
			description: "L'essentiel.",
			features: [],
			cta: {
				label: "En savoir plus",
				href: "/cta-target",
				target: "_self",
				ctaSection: "card-comparator-table-cta",
			},
			badgeLabel: undefined,
		});
	});
});
