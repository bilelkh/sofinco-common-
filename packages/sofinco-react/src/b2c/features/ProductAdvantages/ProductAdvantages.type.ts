/**
 * One category of the "Product advantages" carousel.
 *
 * Each category is linked to a primary image (desktop + mobile WebP variants)
 * with an overlaid HTML-contributed title and text (SEO requirement; inline
 * styles such as bold/italic are allowed).
 */
export interface ProductAdvantageCategory {
	/** Unique category identifier. */
	id: string;
	/** Label displayed in the category tab. */
	label: string;
	/**
	 * Title overlaid on the image, contributed as HTML (SEO).
	 * Size and color are fixed; only inline styles
	 * (bold, italic...) are allowed.
	 */
	title: string;
	/**
	 * Text overlaid on the image, contributed as HTML (SEO).
	 * Size and color are fixed; only inline styles
	 * (bold, italic...) are allowed.
	 */
	text: string;
	/** Desktop image in WebP format (required). */
	imageDesktop: string;
	/** Mobile image in WebP format (required). */
	imageMobile: string;
	/** Alternative text for accessibility. */
	imageAlt?: string;
}

/** Accessibility labels for the carousel. */
export interface ProductAdvantagesA11y {
	/** Label for the category tabs group. */
	tablistLabel?: string;
	/** Label for the "previous" button. */
	prevSlideLabel?: string;
	/** Label for the "next" button. */
	nextSlideLabel?: string;
	/** Label announcing the active category (`{{label}}` is replaced). */
	activeSlideLabel?: string;
}

export interface ProductAdvantagesProps {
	/**
	 * Component title (rendered as H2).
	 * Contributed in Jahia; its size and color are not customizable.
	 */
	title: string;
	/**
	 * Component subtitle (rendered as a paragraph).
	 * Contributed in Jahia; its size and color are not customizable.
	 */
	subtitle?: string;
	/**
	 * Carousel categories (minimum 3, maximum depends on content contribution).
	 */
	categories: ProductAdvantageCategory[];
	/** Accessibility labels. */
	a11y?: ProductAdvantagesA11y;
	/** Additional CSS class applied to the section. */
	className?: string;
}
