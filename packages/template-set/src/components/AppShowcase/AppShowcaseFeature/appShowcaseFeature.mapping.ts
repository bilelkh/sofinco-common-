import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { AppShowcaseFeatureProps } from "./appShowcaseFeature.types";
import { str, imgUrl } from "#lib/jcr";
import { readItemsTitleLevel } from "#cms/Shared/HeadingStyle/headingStyle.mapping";

export function mapAppShowcaseFeatureProps(node: JCRNodeWrapper): AppShowcaseFeatureProps {
	return {
		iconUrl: imgUrl(node, "icon"),
		featureTitle: str(node, "jcr:title") || "",
		// Niveau lu sur le bloc AppShowcase. Repli "h3" = la balise codee en dur.
		featureTitleAs: readItemsTitleLevel(node, "sofnt:appShowcase", "h3"),
		featureText: str(node, "description") || "",
	};
}
