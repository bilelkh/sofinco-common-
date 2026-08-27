import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

// `extractPromotionTracking` ne dépend que du helper `str` de `#lib/jcr`.
// On le remplace par l'implémentation data-driven de `#test/jahia` (lit
// directement le sac de props de `makeNode`) — même approche que les mapping tests.
vi.mock("#lib/jcr", () => import("#test/jahia"));

import { extractPromotionTracking } from "./promotionTracking";

describe("extractPromotionTracking", () => {
	it("retourne undefined quand promotionId est absent (défaut → pas d'attribut data-tracking-view)", () => {
		expect(extractPromotionTracking(makeNode())).toBeUndefined();
	});

	it("retourne undefined quand promotionId est vide", () => {
		expect(extractPromotionTracking(makeNode({ props: { promotionId: "" } }))).toBeUndefined();
	});

	it("peuple l'objet PromotionTracking complet quand promotionId est présent", () => {
		const node = makeNode({
			props: {
				promotionId: "PROMO_PP_2026",
				promotionName: "Prêt Perso été 2026",
				creativeName: "hero-pp-4.50",
				creativeSlot: "hero_top",
				locationId: "home",
			},
		});
		expect(extractPromotionTracking(node)).toEqual({
			promotionId: "PROMO_PP_2026",
			promotionName: "Prêt Perso été 2026",
			creativeName: "hero-pp-4.50",
			creativeSlot: "hero_top",
			locationId: "home",
		});
	});

	it("laisse les champs optionnels à '' quand seul promotionId est contribué", () => {
		const node = makeNode({ props: { promotionId: "PROMO_ONLY" } });
		expect(extractPromotionTracking(node)).toEqual({
			promotionId: "PROMO_ONLY",
			promotionName: "",
			creativeName: "",
			creativeSlot: "",
			locationId: "",
		});
	});
});
