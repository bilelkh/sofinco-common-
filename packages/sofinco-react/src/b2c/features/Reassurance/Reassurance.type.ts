import type { LinkProps } from "@shared/ui/Link/Link.type";
import type { TitleTag } from "@shared/ui/Title/Title.type";
import { type SectionHeadingProps } from "@shared/ui/SectionHeading/SectionHeading.type";

export interface ReassuranceItem {
	id: number | string;
	icon?: string;
	iconAlt?: string;
	title: string;
	/**
	 * Balise du titre d'item. L'APPARENCE reste celle du composant : seule la place dans le
	 * plan de la page est négociable. `h3` par défaut — le niveau codé en dur jusqu'ici.
	 */
	titleAs?: TitleTag;
	text?: string;
	link?: LinkProps;
}

export interface ReassuranceProps {
	/** Optionnel comme partout ailleurs : un bloc sans en-tête reste rendable. */
	sectionHeadingProps?: SectionHeadingProps;
	items: ReassuranceItem[];
	className?: string;
}
