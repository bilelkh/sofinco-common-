import type { HeroSimulatorProps } from "@b2c/features/Hero/ui/HeroSimulator/HeroSimulator.type.js";
import type { CtaProps } from "@shared/ui/Cta/Cta.type.js";
import type { PromotionTracking } from "@b2c/features/Hero/promotionTracking";
import type { HeroImgProps } from "@b2c/features/Hero/ui/HeroImg/HeroImg.type";

export interface HeroV2Props {
	variant: "v2";
	title: string;
	subtitle: string;
	img: HeroImgProps;
	offerTitleBadge?: string;
	offerBadge?: string;
	offerRate?: string;
	offerRateLabel?: string;
	offerRateLabelBis?: string;
	offerAmount?: string;
	offerLegalText?: string;
	cta?: CtaProps;
	simulator?: HeroSimulatorProps;
	className?: string;
	tracking?: PromotionTracking;
}
