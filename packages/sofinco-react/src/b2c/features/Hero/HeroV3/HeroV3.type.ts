import type { HeroSimulatorProps } from "@b2c/features/Hero/ui/HeroSimulator/HeroSimulator.type";
import type { CtaProps } from "@shared/ui/Cta/Cta.type";
import type { PromotionTracking } from "@b2c/features/Hero/promotionTracking";
import type { HeroImgProps } from "@b2c/features/Hero/ui/HeroImg/HeroImg.type";

export interface HeroV3Props {
	variant: "v3";
	title: string;
	subtitle: string;
	img: HeroImgProps;
	hookValue: string;
	hookDateLabel: string;
	cta?: CtaProps;
	simulator?: HeroSimulatorProps;
	className?: string;
	tracking?: PromotionTracking;
	badgeLabel?: string;
}
