import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ComparisonOfferFeature } from "sofinco-react";
import { str } from "#lib/jcr";

/**
 * Maps a `sofnt:comparisonOfferFeature` JCR node to the React
 * `ComparisonOfferFeature`. `jcr:title` holds the short uppercase tag
 * displayed above the text (e.g. "CARTE").
 */
export function mapComparisonOfferFeature(node: JCRNodeWrapper): ComparisonOfferFeature {
	return {
		id: node.getIdentifier(),
		label: str(node, "jcr:title"),
		text: str(node, "text"),
	};
}
