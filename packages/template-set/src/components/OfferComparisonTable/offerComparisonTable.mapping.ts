import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { OfferComparisonTableProps } from "sofinco-react";
import { str, getWrapperItems } from "#lib/jcr";
import { mapComparisonOffer } from "./ComparisonOffer/comparisonOffer.mapping";

/**
 * Maps a `sofnt:offerComparisonTable` JCR node to the React
 * `OfferComparisonTable` props. Offers live under the auto-created `offers`
 * wrapper list.
 */
export function mapOfferComparisonTableProps(node: JCRNodeWrapper): OfferComparisonTableProps {
	const offerNodes = getWrapperItems(node, "sofnt:comparisonOfferList", "sofnt:comparisonOffer");
	return {
		title: str(node, "jcr:title"),
		offers: offerNodes.map(mapComparisonOffer),
	};
}
