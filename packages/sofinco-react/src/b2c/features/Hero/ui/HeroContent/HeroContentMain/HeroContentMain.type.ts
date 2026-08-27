import type { HeroSimulatorProps } from "@b2c/features/Hero/ui/HeroSimulator/HeroSimulator.type";
import type { HeroArgItem } from "@b2c/features/Hero/ui/HeroArgs/HeroArgs.type";

export type HeroContentMainProps = {
	title?: string;
	subtitle?: string;
	args?: HeroArgItem[];
	simulator?: HeroSimulatorProps;
};
