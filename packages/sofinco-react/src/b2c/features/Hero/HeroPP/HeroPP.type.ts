import type { CtaProps } from "@shared/ui/Cta/Cta.type";
import type { AvisClientsStickerProps } from "@b2c/features/AvisClientsSticker/avisClientsSticker.types";
import type { HeroPPOfferCardProps } from "./HeroPPOfferCard/HeroPPOfferCard.type";
import type { PromotionTracking } from "@b2c/features/Hero/promotionTracking";
import type { TitleProps } from "@shared/ui/Title/Title.type";

export type HeroPPProps = {
	title?: TitleProps;
	description: string;
	cta: CtaProps | null;
	avis?: AvisClientsStickerProps;
	offerCard: HeroPPOfferCardProps;
	className?: string;
	tracking?: PromotionTracking;
	eyebrowProps?: TitleProps;
};
