import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { PromotionTracking } from "sofinco-react";
import { str } from "#lib/jcr";

/**
 * Extrait le mixin `sofmix:promotionTracking` (défini dans Hero/Hero/definitions.cnd)
 * pour supporter les events GTM `view_promotion` / `select_promotion`.
 *
 * Retourne `undefined` quand `promotionId` est vide → les composants DS
 * (`<Hero>`, `<HeroPP>`, …) n'émettent alors pas d'attribut `data-tracking-view`
 * (cf. `buildViewPromotionAttr` dans sofinco-react).
 *
 * Source de vérité unique partagée par tous les composants porteurs du mixin.
 */
export function extractPromotionTracking(node: JCRNodeWrapper): PromotionTracking | undefined {
	const promotionId = str(node, "promotionId");
	if (!promotionId) return undefined;
	return {
		promotionId,
		promotionName: str(node, "promotionName"),
		creativeName: str(node, "creativeName"),
		creativeSlot: str(node, "creativeSlot"),
		locationId: str(node, "locationId"),
	};
}
