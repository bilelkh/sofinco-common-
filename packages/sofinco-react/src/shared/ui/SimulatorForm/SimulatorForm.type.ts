import type { CtaProps } from "@shared/ui/Cta/Cta.type";

/**
 * Réglages surchargeables du champ montant. Chaque valeur laissée vide (ou
 * absente) retombe sur le défaut porté par `<SimulatorForm>` — source de vérité
 * unique, à ne dupliquer ni dans les composants parents ni dans les mappers Jahia.
 *
 * Interface partagée par tous les composants qui rendent un `<SimulatorForm>`
 * (`SimulatorBlock`, `HeroSimulator`, feuille simulateur du `ChatBot`) — côté
 * Jahia elle correspond au mixin `sofmix:simulatorAmount`, d'où l'alignement
 * strict des noms.
 */
export interface SimulatorAmountOptions {
	/**
	 * Placeholder du champ montant. Défaut : « J'ai besoin de ».
	 */
	amountPlaceholder?: string;
	/**
	 * Message affiché quand le champ est vide à la soumission.
	 * Défaut : « Ce champ est requis ».
	 */
	requiredErrorMessage?: string;
	/**
	 * Message affiché sous `amountMin`. Le jeton `{min}` est remplacé par la
	 * borne effective. Défaut : « Le montant minimum est de {min}€ ».
	 */
	minErrorMessage?: string;
	/**
	 * Message affiché au-dessus de `amountMax`. Le jeton `{max}` est remplacé par
	 * la borne effective. Défaut : « Le montant maximum est de {max}€ ».
	 */
	maxErrorMessage?: string;
}

export interface SimulatorFormProps extends SimulatorAmountOptions {
	formId?: string;
	amountMin: number;
	amountMax: number;
	ctaLabel: string;
	ctaVariant: CtaProps["variant"];
	ctaSection: string;
	ctaHref?: string;
	ctaTarget?: string;
	errorMessage?: string;
	className?: string;
	/**
	 * Quand fourni, court-circuite la navigation simulateur : appelé avec le montant
	 * validé (nombre). Utilisé par le ChatBot (flux conversationnel) — le parent gère
	 * l'écho de la bulle, le tracking et la transition d'état. Les autres consommateurs
	 * (HeroSimulator, SimulatorBlock) l'omettent et gardent la redirection native.
	 */
	onSubmit?: (amount: number) => void;
}
