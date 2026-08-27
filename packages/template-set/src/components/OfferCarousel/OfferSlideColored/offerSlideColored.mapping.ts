import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { OfferSlideColoredProps } from "sofinco-react";
import { str, imgUrl } from "#lib/jcr";
import { getCtaProps } from "#lib/cta";

export function mapOfferSlideColoredProps(node: JCRNodeWrapper): OfferSlideColoredProps {
	return {
		variant: "colored",
		id: node.getIdentifier(),
		title: str(node, "jcr:title"),
		description: str(node, "description"),
		eyebrow: str(node, "eyebrow") || undefined,
		backgroundColor: str(node, "backgroundColor"),
		img: imgUrl(node, "illustration"),
		cta: getCtaProps(node, "offer-slide-colored-cta") ?? undefined,
	};
}
