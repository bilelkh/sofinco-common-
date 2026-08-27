import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { OfferSlideGlossyProps } from "sofinco-react";
import { str, imgUrl } from "#lib/jcr";
import { getRequiredCtaProps } from "#lib/cta";

export function mapOfferSlideGlossyProps(node: JCRNodeWrapper): OfferSlideGlossyProps {
	return {
		variant: "glossy",
		id: node.getIdentifier(),
		title: str(node, "jcr:title"),
		description: str(node, "description"),
		imgMobile: imgUrl(node, "imgMobile"),
		imgDesktop: imgUrl(node, "imgDesktop"),
		cta: getRequiredCtaProps(node, "offer-slide-glossy-cta"),
	};
}
