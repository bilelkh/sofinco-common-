import type { HeroProps } from "../hero.types";
import type { QrProps } from "../../QrCode/QrCode.type";
import type { HeroSimulatorProps } from "../ui/HeroSimulator/HeroSimulator.type";

export interface SectionProps {
	hero?: HeroProps;
	qrApp?: QrProps;
	simulator?: HeroSimulatorProps;
}
