import type { CtaProps } from "@shared/ui/Cta/Cta.type";

export interface OfferSlideGlossyProps {
	/** Discriminant — must be `"glossy"`. */
	variant: "glossy";
	/** Unique slide identifier. */
	id: string;
	/** Main heading displayed on the glass card. */
	title: string;
	/** Body text displayed below the title. */
	description: string;
	/** Background image URL for mobile (portrait crop). */
	imgMobile: string;
	/** Background image URL for desktop (landscape crop). */
	imgDesktop: string;
	/** Call-to-action link rendered at the bottom of the card. */
	cta: CtaProps;
}
