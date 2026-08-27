import type { HeroSimulatorProps } from "@b2c/features/Hero/ui/HeroSimulator/HeroSimulator.type";
import type { CtaProps } from "@shared/ui/Cta/Cta.type";

export type HeroContentMainVideoProps = {
	title?: string;
	subtitle?: string;
	simulator?: HeroSimulatorProps;
	campaignCta?: CtaProps;
};
