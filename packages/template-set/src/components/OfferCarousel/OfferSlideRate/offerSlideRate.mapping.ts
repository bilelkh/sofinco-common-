import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { OfferSlideRateProps } from "sofinco-react";
import { str } from "#lib/jcr";
import { getRequiredCtaProps } from "#lib/cta";

export function mapOfferSlideRateProps(node: JCRNodeWrapper): OfferSlideRateProps {
	return {
		variant: "rate",
		id: node.getIdentifier(),
		rateValue: str(node, "rateValue"),
		rateSuffix: str(node, "rateSuffix"),
		description: str(node, "description"),
		eyebrow: str(node, "eyebrow"),
		cta: getRequiredCtaProps(node, "offer-slide-rate-cta"),
	};
}
