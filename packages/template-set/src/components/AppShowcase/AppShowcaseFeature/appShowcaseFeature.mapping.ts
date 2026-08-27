import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { AppShowcaseFeatureProps } from "./appShowcaseFeature.types";
import { str, imgUrl } from "#lib/jcr";

export function mapAppShowcaseFeatureProps(node: JCRNodeWrapper): AppShowcaseFeatureProps {
	return {
		iconUrl: imgUrl(node, "icon"),
		featureTitle: str(node, "jcr:title") || "",
		featureText: str(node, "description") || "",
	};
}
