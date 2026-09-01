import type { CtaProps } from "@shared/ui/Cta/Cta.type";
import type { SimulatorAmountOptions } from "@shared/ui/SimulatorForm/SimulatorForm.type";
import type { TitleProps } from "@shared/ui/Title/Title.type";

export interface SimulatorBlockProps extends SimulatorAmountOptions {
	/**
	 * `Omit<…, "visualStyle">` : ce composant impose `visualStyle="none"`. Sa typographie
	 * est sur mesure (`.simulator-block__title`), pas une des quatre échelles du DS —
	 * accepter la prop laisserait un appelant croire qu'elle a un effet, alors qu'elle
	 * serait écrasée, ou pire : gagnerait la cascade et casserait la barre.
	 */
	title: Omit<TitleProps, "visualStyle">;
	amountMin: number;
	amountMax: number;
	cta?: CtaProps | null;
	errorMessage?: string;
}
