import type { TitleProps } from "@shared/ui/Title/Title.type";
import type { ProductFocusItemData } from "./ui/ProductFocusItem/ProductFocusItem.type";

export interface ProductFocusProps {
	/** H2 title, stylable via `sofmix:headingStyle` on the Jahia side. Omit to render no heading. */
	title?: TitleProps;
	/** Optional subtitle displayed below the title. */
	subtitle?: string;
	/** Central image (decorative — `alt=""` is applied by the design system). */
	imageSrc: string;
	/** Arguments displayed in the left column on desktop (above the right ones on mobile). */
	leftFeatures: ProductFocusItemData[];
	/** Arguments displayed in the right column on desktop (below the left ones on mobile). */
	rightFeatures: ProductFocusItemData[];
	/**
	 * Background color of the whole section (contributed value, e.g.
	 * "#D8ECF9"). Falls back to a neutral ice surface token.
	 */
	backgroundColor?: string;
	/** Additional CSS class applied to the section. */
	className?: string;
}
