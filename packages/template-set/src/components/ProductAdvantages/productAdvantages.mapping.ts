import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ProductAdvantagesProps } from "sofinco-react";
import { str, getWrapperItems } from "#lib/jcr";
import { mapProductAdvantageCategory } from "./ProductAdvantageCategory/productAdvantageCategory.mapping";

/**
 * Maps a `sofnt:productAdvantages` JCR node to the React `ProductAdvantages`
 * props. Categories live under the auto-created `categories` wrapper list.
 */
export function mapProductAdvantagesProps(node: JCRNodeWrapper): ProductAdvantagesProps {
	const categoryNodes = getWrapperItems(
		node,
		"sofnt:productAdvantageCategoryList",
		"sofnt:productAdvantageCategory",
	);
	return {
		title: str(node, "jcr:title"),
		subtitle: str(node, "subtitle") || undefined,
		categories: categoryNodes.map(mapProductAdvantageCategory),
	};
}
