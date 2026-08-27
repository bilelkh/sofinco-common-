import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ComparatorFeature } from "sofinco-react";
import { str, getAsBoolean } from "#lib/jcr";

/**
 * Maps a `sofnt:comparatorFeature` JCR node to the React `ComparatorFeature`
 * pill rendered inside a `ComparatorCard`. `included` drives the check/cross icon
 * and defaults to true (a contributed feature is included unless flagged otherwise).
 */
export function mapComparatorFeature(node: JCRNodeWrapper): ComparatorFeature {
	return {
		id: node.getIdentifier(),
		label: str(node, "label"),
		included: getAsBoolean(node, "included", true),
	};
}
