import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { OfferCarouselProps, OfferSlide } from "sofinco-react";
import { getWrapperItems } from "#lib/jcr";
import { mapOfferSlideGlossyProps } from "../OfferSlideGlossy/offerSlideGlossy.mapping";
import { mapOfferSlideColoredProps } from "../OfferSlideColored/offerSlideColored.mapping";
import { mapOfferSlideRateProps } from "../OfferSlideRate/offerSlideRate.mapping";

export function mapOfferProps(node: JCRNodeWrapper): OfferCarouselProps {
	const slideNodes = getWrapperItems(node, "sofnt:offerSlideList", "sofmix:offerSlide");
	const slides = slideNodes.map((n) => mapOfferSlide(n));
	return {
		slides,
	};
}

/**
 * Detects the slide variant from JCR node type and dispatches to the right mapper.
 * Each mapper returns a fully discriminated `OfferSlide` (variant + id included),
 * ready to be consumed by the React `OfferCarousel`.
 */
export const mapOfferSlide = (node: JCRNodeWrapper): OfferSlide => {
	if (node.isNodeType("sofnt:offerSlideGlossy")) {
		return mapOfferSlideGlossyProps(node);
	}
	if (node.isNodeType("sofnt:offerSlideColored")) {
		return mapOfferSlideColoredProps(node);
	}
	if (node.isNodeType("sofnt:offerSlideRate")) {
		return mapOfferSlideRateProps(node);
	}
	throw new Error(`Unknown offer slide variant at ${node.getPath()}`);
};
