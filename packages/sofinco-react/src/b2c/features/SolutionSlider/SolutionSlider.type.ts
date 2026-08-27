import type { CtaProps } from "@shared/ui/Cta/Cta.type";

/**
 * One credit-product card rendered as a slide inside the Solution carousel.
 */
export interface SolutionItem {
	/** Stable unique identifier — used as React key. */
	id: string;
	/** URL of the card's hero image. */
	image: string;
	/**
	 * Art-directed mobile crop, served below 600px. Optional: without it, `image`
	 * is used at every width. Same breakpoint as `SolutionComplementary`, so a
	 * card swaps at the same width whichever section renders it.
	 */
	imageMobile?: string;
	/** Card title (e.g. "Prêt personnel"). */
	title: string;
	/** Short marketing description displayed under the title. */
	description: string;
	/** Up to 3 short selling-points rendered as pill bullets with a check icon. */
	features: string[];
	/** Label of the primary call-to-action button at the bottom of the card. */
	ctaLabel: string;
	/** Destination URL for the CTA. */
	href: string;
	/** Anchor target for the CTA. Defaults to `_self`. */
	target?: "_self" | "_blank";
}

/**
 * Optional accessibility messages forwarded to Swiper's `A11y` module.
 * All values are localized strings; sensible French defaults are provided.
 */
export interface SolutionA11y {
	/** `aria-label` set on the carousel container and section. */
	containerLabel?: string;
	/** Message announced for the "previous" navigation button. */
	prevSlideLabel?: string;
	/** Message announced for the "next" navigation button. */
	nextSlideLabel?: string;
	/** Message announced when reaching the first slide. */
	firstSlideLabel?: string;
	/** Message announced when reaching the last slide. */
	lastSlideLabel?: string;
	/** Message used to label each slide. Supports `{{index}}` and `{{slidesLength}}` placeholders. */
	slideLabel?: string;
	/** ARIA role applied to each slide element. Defaults to `"group"`. */
	slideRole?: string;
}

/**
 * Props of the `Solution` section — a horizontal carousel of credit products.
 */
export interface SolutionProps {
	/** Section heading shown above the carousel. */
	title?: string;
	/** Optional intro paragraph displayed under the title. */
	subtitle?: string;
	/** Cards to render as carousel slides. */
	items: SolutionItem[];
	/** Override Swiper a11y messages (French defaults are used otherwise). */
	a11y?: SolutionA11y;
	/** Extra class appended to the root `<section>` element. */
	className?: string;
}

/**
 * Props of a single `SolutionCard` — the presentational card used inside a slide.
 */
export interface SolutionCardProps {
	/** URL of the card's hero image. */
	image: string;
	/**
	 * Art-directed mobile crop, served below 600px. Optional: without it, `image`
	 * is used at every width.
	 */
	imageMobile?: string;
	/** Card title (e.g. "Prêt personnel"). */
	title: string;
	/** Short marketing description displayed under the title. */
	description: string;
	/** Up to 3 short selling-points rendered as pill bullets with a check icon. */
	features: string[];
	/** Configuration of the primary call-to-action button at the bottom of the card. */
	cta: {
		/** Label of the CTA. */
		label: string;
		/** Destination URL of the CTA. */
		href: string;
		/** Anchor target for the CTA. Defaults to `_self`. */
		target?: "_self" | "_blank";
		/** Visual variant forwarded to the shared `Cta` component. Defaults to `"primary"`. */
		variant?: CtaProps["variant"];
		/** Size forwarded to the shared `Cta` component. Defaults to `"medium"`. */
		size?: CtaProps["size"];
	};
	/** Extra class appended to the card root. */
	className?: string;
}

export type SolutionSliderItem = SolutionItem;
export type SolutionSliderA11y = SolutionA11y;
export type SolutionSliderProps = SolutionProps;
export type SolutionSliderCardProps = SolutionCardProps;
