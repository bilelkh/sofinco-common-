import type { CtaProps } from "@shared/ui/Cta/Cta.type";

export interface OfferSlideColoredProps {
	/** Discriminant — must be `"colored"`. */
	variant: "colored";
	/** Unique slide identifier. */
	id: string;
	/** Main heading displayed on the slide. */
	title: string;
	/** Body text displayed below the title. */
	description: string;
	/** Optional label displayed above the title (e.g. award or context tag). */
	eyebrow?: string;
	/** Section background color (hex value, e.g. `"#FDF0FE"`). */
	backgroundColor: string;
	/** Illustration URL displayed alongside the text content. */
	img: string;
	/** Optional call-to-action link. */
	cta?: CtaProps;
}
