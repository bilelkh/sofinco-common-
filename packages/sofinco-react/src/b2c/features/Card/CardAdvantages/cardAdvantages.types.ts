import type { CtaProps } from "@shared/ui/Cta/Cta.type";
import type { CardArgumentProps } from "@b2c/features/Card/CardArgument/cardArgument.types";

export interface CardAdvantagesProps {
	/** Main title of section 1 (pinned). */
	title: string;
	/** Main subtitle of section 1. */
	subtitle: string;
	/** Title of section 2 ("life moments"). */
	momentsTitle: string;
	/** Subtitle of section 2. */
	momentsSubtitle: string;
	/** List of product arguments displayed in zigzag (max 3 rendered). Optional. */
	arguments?: CardArgumentProps[];
	/** Card image URL (central sticky visual). */
	cardImage: string;
	/** Main CTA (floating CTA below the card). Optional — when present, its `label` is rendered. */
	cta: CtaProps | null;
	/** Background image of section 2 (desktop). */
	imageDesktop?: string;
	/** Background image of section 2 (mobile). Optional, falls back to `imageDesktop`. */
	imageMobile?: string;
	/** Additional class on the wrapper. */
	className?: string;
}
