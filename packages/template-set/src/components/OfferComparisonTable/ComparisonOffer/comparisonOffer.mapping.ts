import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ComparisonOffer } from "sofinco-react";
import { str, imgUrl, getChildNode, getChildNodesByType } from "#lib/jcr";
import { getRequiredCtaProps } from "#lib/cta";
import { mapComparisonOfferFeature } from "../ComparisonOfferFeature/comparisonOfferFeature.mapping";

/** Choicelist default, mirrored here so live rendering never gets an empty color. */
const DEFAULT_BACKGROUND_COLOR = "#9FF0EA";

/**
 * Maps a `sofnt:comparisonOffer` JCR node to the React `ComparisonOffer`
 * consumed by the `OfferComparisonTable` Island. `jcr:title` holds the offer
 * selector label; features live under the `leftFeatures` / `rightFeatures`
 * wrapper lists (same type, resolved by child name — see definition.cnd).
 */
export function mapComparisonOffer(node: JCRNodeWrapper): ComparisonOffer {
	const featuresOf = (wrapperName: string) => {
		const wrapper = getChildNode(node, wrapperName);
		if (!wrapper) return [];
		return getChildNodesByType(wrapper, "sofnt:comparisonOfferFeature").map(
			mapComparisonOfferFeature,
		);
	};

	return {
		id: node.getIdentifier(),
		label: str(node, "jcr:title"),
		image: {
			src: imgUrl(node, "illustration"),
			alt: str(node, "illustrationAlt") || undefined,
		},
		leftFeatures: featuresOf("leftFeatures"),
		rightFeatures: featuresOf("rightFeatures"),
		backgroundColor: str(node, "backgroundColor", DEFAULT_BACKGROUND_COLOR),
		cta: getRequiredCtaProps(node, "offer-comparison-table-cta"),
	};
}
