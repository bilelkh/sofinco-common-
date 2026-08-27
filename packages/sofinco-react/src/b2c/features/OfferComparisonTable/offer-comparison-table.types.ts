import type { CtaProps } from "@shared/ui/Cta/Cta.type";

/** One argument displayed in a feature column of an offer. */
export interface ComparisonOfferFeature {
	/** Unique identifier (stable React key). */
	id: string;
	/** Short uppercase tag displayed above the text (e.g. "CARTE", "CRÉDIT"). */
	label: string;
	/** Plain-text description of the argument. */
	text: string;
}

/** Main visual of an offer. */
export interface ComparisonOfferImage {
	src: string;
	/** Alternative text; empty string if the image is purely decorative. */
	alt?: string;
}

/** One offer of the comparison table. */
export interface ComparisonOffer {
	/** Unique identifier (React key + column id). */
	id: string;
	/** Label of the offer selector button / column header (e.g. "La carte Pure"). */
	label: string;
	image: ComparisonOfferImage;
	/** Arguments displayed in the left column on desktop (above the right ones on mobile). */
	leftFeatures: ComparisonOfferFeature[];
	/** Arguments displayed in the right column on desktop (below the left ones on mobile). */
	rightFeatures: ComparisonOfferFeature[];
	/**
	 * Background color applied to the whole section while this offer is
	 * active (contributed value, e.g. "#D8ECF5").
	 */
	backgroundColor: string;
	/** CTA displayed below the table when this offer is active. */
	cta: CtaProps;
}

export interface OfferComparisonTableProps {
	/** Section title (rendered as H2 and as the table's visually hidden caption). */
	title: string;
	/** Offers to compare (designed for 2 or 3). */
	offers: ComparisonOffer[];
	/** Additional CSS class applied to the section. */
	className?: string;
}
