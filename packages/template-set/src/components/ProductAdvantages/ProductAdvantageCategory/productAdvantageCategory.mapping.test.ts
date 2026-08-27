import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import { mapProductAdvantageCategory } from "./productAdvantageCategory.mapping";

describe("mapProductAdvantageCategory", () => {
	it("maps a fully contributed category", () => {
		const node = makeNode({
			id: "cat-1",
			props: {
				"jcr:title": "Réserve d'argent",
				"heading": "Une réserve <strong>disponible</strong>",
				"text": "<p>Réutilisable au fur et à mesure.</p>",
				"imageDesktop": "/files/desktop.webp",
				"imageMobile": "/files/mobile.webp",
				"imageAlt": "Une cliente au quotidien",
			},
		});

		expect(mapProductAdvantageCategory(node)).toEqual({
			id: "cat-1",
			label: "Réserve d'argent",
			title: "Une réserve <strong>disponible</strong>",
			text: "<p>Réutilisable au fur et à mesure.</p>",
			imageDesktop: "/files/desktop.webp",
			imageMobile: "/files/mobile.webp",
			imageAlt: "Une cliente au quotidien",
		});
	});

	it("omits imageAlt when not contributed", () => {
		const node = makeNode({
			id: "cat-2",
			props: {
				"jcr:title": "Étalement",
				"heading": "Étalez après avoir payé",
				"text": "<p>3, 12 ou 60 mensualités.</p>",
				"imageDesktop": "/files/d.webp",
				"imageMobile": "/files/m.webp",
			},
		});

		expect(mapProductAdvantageCategory(node).imageAlt).toBeUndefined();
	});
});
