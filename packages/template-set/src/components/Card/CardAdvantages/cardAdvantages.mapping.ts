import { str, imgUrl, getChildNodesByType } from "#lib/jcr";
import { getCtaProps } from "#lib/cta";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { CardAdvantagesProps } from "sofinco-react";
import { mapCardArgumentProps } from "../CardArgument/cardArgument.mapping";

const mapProps = (node: JCRNodeWrapper): CardAdvantagesProps => {
	return {
		title: str(node, "jcr:title"),
		subtitle: str(node, "subtitle"),
		cardImage: imgUrl(node, "cardImage"),
		cta: getCtaProps(node, "card-advantages-cta"),
		momentsTitle: str(node, "momentsTitle"),
		momentsSubtitle: str(node, "momentsSubtitle"),
		imageDesktop: imgUrl(node, "imageDesktop"),
		imageMobile: imgUrl(node, "imageMobile"),
	};
};

export const mapCardAdvantagesPropsClient = (node: JCRNodeWrapper): CardAdvantagesProps => {
	const argNodes = getChildNodesByType(node, "sofnt:cardArgument");
	const args = argNodes.map((n) => mapCardArgumentProps(n));

	return {
		...mapProps(node),
		arguments: args,
	};
};

export const mapCardAdvantagesPropsServer = (node: JCRNodeWrapper): CardAdvantagesProps => {
	return mapProps(node);
};
