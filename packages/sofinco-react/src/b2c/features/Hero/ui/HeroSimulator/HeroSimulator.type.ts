import type { CtaProps } from "@shared/ui/Cta/Cta.type";
import type { SimulatorAmountOptions } from "@shared/ui/SimulatorForm/SimulatorForm.type";

export interface HeroSimulatorProps extends SimulatorAmountOptions {
	simulatorTitle: string;
	amountMin: number;
	amountMax: number;
	cta?: CtaProps | null;
	errorMessage?: string;
}
