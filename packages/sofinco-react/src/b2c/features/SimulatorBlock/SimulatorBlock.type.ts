import type { CtaProps } from "@shared/ui/Cta/Cta.type";
import type { SimulatorAmountOptions } from "@shared/ui/SimulatorForm/SimulatorForm.type";
import type { TitleProps } from "@shared/ui/Title/Title.type";

export interface SimulatorBlockProps extends SimulatorAmountOptions {
	title: Omit<TitleProps, "visualStyle">;
	amountMin: number;
	amountMax: number;
	cta?: CtaProps | null;
	errorMessage?: string;
}
