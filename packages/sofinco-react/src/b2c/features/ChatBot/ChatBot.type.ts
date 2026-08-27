import type { SimulatorAmountOptions } from "@shared/ui/SimulatorForm/SimulatorForm.type";

export interface CategorySimulator extends SimulatorAmountOptions {
	/** Libellé du bouton de validation du montant (ex. "Je valide"). */
	amountCtaLabel?: string;
	amountMin: number;
	amountMax: number;
	/** Libellé du CTA simulateur (turquoise, ex. "Je simule mon prêt"). */
	simulatorCtaLabel: string;
	/** URL simulateur forgée (…?project=…#/montant-financement). */
	simulatorCtaUrl: string;
	/** simProject authoré — aussi la vraie valeur "projet" de tracking. */
	project?: string;
}

export interface Category {
	label: string;
	question?: string;
	children?: Category[];
	conclusion?: string;
	features?: string[];
	ctaLabel?: string;
	ctaUrl?: string;
	ctaTarget?: string;
	/** Présent → variante feuille simulateur (champ montant + 2 CTA). */
	simulator?: CategorySimulator;
}

export interface ChatBotData {
	greeting: string;
	question: string;
	categories: Category[];
	avatarUrl: string;
}

export interface ChatBotProps {
	data: ChatBotData;
}
