import type { CtaProps } from "@shared/ui/Cta/Cta.type";
import type { HeroSimulatorProps } from "@b2c/features/Hero/ui/HeroSimulator/HeroSimulator.type";

export interface HeroContentMainBigRateProps {
	title: string;
	subtitle: string;
	hookValue: string;
	hookDateLabel: string;
	cta?: CtaProps;
	simulator?: HeroSimulatorProps;
	badgeLabel?: string;
}
