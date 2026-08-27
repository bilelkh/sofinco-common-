import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ProductFocusItemData } from "sofinco-react";
import { str } from "#lib/jcr";

/**
 * Maps a `sofnt:productFocusItem` JCR node to the React `ProductFocusItemData`
 * consumed by the `<ProductFocus>` design-system block.
 */
export function mapProductFocusItem(node: JCRNodeWrapper): ProductFocusItemData {
	return {
		id: node.getIdentifier(),
		label: str(node, "jcr:title"),
		description: str(node, "description"),
	};
}
