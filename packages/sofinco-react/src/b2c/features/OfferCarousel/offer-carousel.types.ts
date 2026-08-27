import type { OfferSlideGlossyProps } from "./ui/OfferSlides/OfferSlideGlossy";
import type { OfferSlideColoredProps } from "./ui/OfferSlides/OfferSlideColored";
import type { OfferSlideRateProps } from "./ui/OfferSlides/OfferSlideRate";

/** Discriminated union of all supported slide variants. */
export type OfferSlide = OfferSlideGlossyProps | OfferSlideColoredProps | OfferSlideRateProps;

export interface OfferCarouselProps {
	/** List of slides to display in the carousel. */
	slides: OfferSlide[];
}
