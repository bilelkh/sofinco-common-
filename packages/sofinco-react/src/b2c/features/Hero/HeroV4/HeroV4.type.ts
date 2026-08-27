import type { HeroSimulatorProps } from "@b2c/features/Hero/ui/HeroSimulator/HeroSimulator.type.js";
import type { CtaProps } from "@shared/ui/Cta/Cta.type.js";
import type { QrCodeProps } from "@b2c/features/QrCode/QrCode.type.js";
import type { PromotionTracking } from "@b2c/features/Hero/promotionTracking";

export interface HeroVideoSources {
	srcDesktop: string;
	srcMobile?: string;
	poster?: string;
}

export interface HeroV4Props {
	variant: "v4";
	title: string;
	subtitle: string;
	video: HeroVideoSources;
	campaignCta?: CtaProps;
	qr?: QrCodeProps;
	simulator?: HeroSimulatorProps;
	className?: string;
	tracking?: PromotionTracking;
}
