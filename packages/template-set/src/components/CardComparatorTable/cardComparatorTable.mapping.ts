import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { CardComparatorTableProps } from "sofinco-react";
import { str, getWrapperItems } from "#lib/jcr";
import { mapComparatorCard } from "./ComparatorCard/comparatorCard.mapping";

/**
 * Maps a `sofnt:cardComparatorTable` JCR node to the React `CardComparatorTable`
 * props. Cards live under the auto-created `cards` wrapper list.
 */
export function mapCardComparatorTableProps(node: JCRNodeWrapper): CardComparatorTableProps {
	const cardNodes = getWrapperItems(node, "sofnt:comparatorCardList", "sofnt:comparatorCard");
	return {
		title: str(node, "jcr:title") || undefined,
		subtitle: str(node, "subtitle") || undefined,
		items: cardNodes.map(mapComparatorCard),
	};
}
