export interface PromotionTracking {
	promotionId: string;
	promotionName: string;
	creativeName: string;
	creativeSlot: string;
	locationId: string;
}

function buildPromotionEvent(event: string, tracking: PromotionTracking) {
	return {
		event,
		ecommerce: {
			promotions: [
				{
					promotion_id: tracking.promotionId,
					promotion_name: tracking.promotionName,
					creative_name: tracking.creativeName,
					creative_slot: tracking.creativeSlot,
					location_id: tracking.locationId,
				},
			],
		},
	};
}

export function buildViewPromotionAttr(tracking?: PromotionTracking): string | undefined {
	if (!tracking?.promotionId) return undefined;
	return JSON.stringify(buildPromotionEvent("view_promotion", tracking));
}

export function buildSelectPromotionEvent(tracking?: PromotionTracking) {
	if (!tracking?.promotionId) return undefined;
	return buildPromotionEvent("select_promotion", tracking);
}
