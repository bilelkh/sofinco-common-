import type { HeroSimulatorProps } from "@b2c/features/Hero/ui/HeroSimulator/HeroSimulator.type";
import type { PromotionTracking } from "@b2c/features/Hero/promotionTracking";
import type { HeroImgProps } from "../ui/HeroImg/HeroImg.type";

export interface ArgumentItem {
	id: string;
	label: string;
}

export interface HeroV1Props {
	variant: "v1";
	title: string;
	subtitle: string;
	img: HeroImgProps;
	args: ArgumentItem[];
	simulator?: HeroSimulatorProps;
	className?: string;
	tracking?: PromotionTracking;
}
