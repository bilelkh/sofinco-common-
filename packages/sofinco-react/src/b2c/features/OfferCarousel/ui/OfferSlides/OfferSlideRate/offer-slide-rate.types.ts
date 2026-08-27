import type { CtaProps } from "@shared/ui/Cta/Cta.type";

export interface OfferSlideRateProps {
	/** Discriminant — must be `"rate"`. */
	variant: "rate";
	/** Unique slide identifier. */
	id: string;
	/** Financial rate string to display (e.g. `"4,50%"`). Parsed into integer, decimal and symbol parts. */
	rateValue: string;
	/** Rate suffix displayed below the rate value (e.g. `"TAEG FIXE"`). Hidden on desktop. */
	rateSuffix: string;
	/** Body text displayed below the rate. */
	description: string;
	/** Label displayed above the rate (e.g. promotional deadline). */
	eyebrow: string;
	/** Call-to-action link rendered at the bottom of the slide. */
	cta: CtaProps;
}
