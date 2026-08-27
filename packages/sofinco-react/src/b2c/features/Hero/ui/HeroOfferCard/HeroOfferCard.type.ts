import type { CtaProps } from "@shared/ui/Cta/Cta.type.js";

export type HeroOfferCardProps = {
	titleBadge?: string;
	badge?: string;
	rate?: string;
	rateLabel?: string;
	rateLabelBis?: string;
	amount?: string;
	legalText?: string;
	cta?: CtaProps;
	/**
	 * Forces the desktop "pinned" layout (absolute, top-left, 286px) at every
	 * breakpoint instead of the responsive mobile flow. Used by the Jahia
	 * edit-mode view so the card keeps its live desktop position while editing.
	 */
	pinned?: boolean;
};
