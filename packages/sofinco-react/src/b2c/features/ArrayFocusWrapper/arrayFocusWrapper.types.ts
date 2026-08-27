import type { SectionHeadingProps } from "@shared/ui/SectionHeading/SectionHeading.type";
import type { ProductFocusProps } from "@b2c/features/ProductFocus";
import type { SeoBlockProps } from "@b2c/features/SeoBlock";
import type { InsuranceFocusProps } from "@b2c/features/InsuranceFocus";

export interface ArrayFocusWrapperProps {
	/**
	 * Section-level heading rendered above the blocks (centered by default).
	 * Its `id` (or a generated one) names the wrapper `<section>` via
	 * `aria-labelledby`.
	 */
	sectionHeading: SectionHeadingProps;
	/**
	 * Product spotlight block. `backgroundColor` is omitted since the wrapper
	 * paints the single shared background (see `backgroundColor` below);
	 * `title`/`subtitle` are omitted since the wrapper's own `sectionHeading`
	 * owns the heading for the whole group.
	 */
	productFocus: Omit<ProductFocusProps, "backgroundColor" | "title" | "subtitle">;
	/** SEO text block rendered below the product focus. */
	seoBlock: SeoBlockProps;
	/**
	 * Insurance promo card rendered last. Its full-width sky wash is
	 * neutralized so the wrapper background shows through (the navy card
	 * itself is untouched).
	 */
	insuranceFocus: InsuranceFocusProps;
	/**
	 * Background color shared by the whole section (contributed value, e.g.
	 * "#D8ECF9"). Falls back to a neutral ice surface token.
	 */
	backgroundColor?: string;
	/** Additional CSS class applied to the wrapper section. */
	className?: string;
}
