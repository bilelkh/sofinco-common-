import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ProductAdvantagesProps } from "sofinco-react";
import { str, getWrapperItems } from "#lib/jcr";
import { readTitleLevel, readTitleStyle } from "../Shared/HeadingStyle/headingStyle.mapping";
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
		/*
		 * Un seul objet pour tout l'en-tete : `sofmix:sectionHeader` porte titre, sous-titre et
		 * niveau, et `SectionHeadingProps` les attend groupes. Un mixin CND <-> un objet de props.
		 */
		sectionHeadingProps: {
			title: str(node, "jcr:title"),
			subtitle: str(node, "subtitle") || undefined,
			titleAs: readTitleLevel(node),
			visualStyle: readTitleStyle(node),
		},
		categories: categoryNodes.map(mapProductAdvantageCategory),
	};
}
