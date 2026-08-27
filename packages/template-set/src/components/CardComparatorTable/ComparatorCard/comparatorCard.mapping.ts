import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ComparatorCardProps } from "sofinco-react";
import { str, imgUrl, getWrapperItems } from "#lib/jcr";
import { getRequiredCtaProps } from "#lib/cta";
import { mapComparatorFeature } from "./ComparatorFeature/comparatorFeature.mapping";

/**
 * Maps a `sofnt:comparatorCard` JCR node to the React `ComparatorCardProps`
 * consumed by the `CardComparatorTable` grid/slider. Features live under the
 * auto-created `features` wrapper list; the CTA comes from the `sofmix:cta` mixin.
 * The mapped cta carries the link fields plus the tracking `ctaSection`; the
 * React card applies its own variant/size defaults.
 */
export function mapComparatorCard(node: JCRNodeWrapper): ComparatorCardProps {
	const featureNodes = getWrapperItems(
		node,
		"sofnt:comparatorFeatureList",
		"sofnt:comparatorFeature",
	);
	const cta = getRequiredCtaProps(node, "card-comparator-table-cta");
	return {
		id: node.getIdentifier(),
		image: imgUrl(node, "image"),
		title: str(node, "jcr:title"),
		description: str(node, "description"),
		features: featureNodes.map(mapComparatorFeature),
		cta: {
			label: cta.label ?? "",
			href: cta.href ?? "",
			target: cta.target === "_blank" ? "_blank" : "_self",
			ctaSection: cta.ctaSection,
		},
		badgeLabel: str(node, "badgeLabel") || undefined,
	};
}
