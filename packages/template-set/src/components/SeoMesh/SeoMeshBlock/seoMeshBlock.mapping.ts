import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { SeoMeshBlockPropsServer } from "./seoMeshBlock.types";
import type { BlockProps, CtaProps } from "sofinco-react";
import { str, nodeUrl, getChildNodesByType } from "#lib/jcr";
import { mapSeoMeshSection } from "../SeoMeshSection/seoMeshSection.mapping";

function getCommunProps(node: JCRNodeWrapper) {
	return {
		title: str(node, "blockTitle"),
		titleLevel: str(node, "blockTitleLevel"),
		titleSize: str(node, "blockTitleSize"),
		ctaTitle: str(node, "blockCtaTitle"),
		ctaUrl: nodeUrl(node, "blockCtaTarget"),
		ariaLabel: str(node, "ariaLabel"),
	};
}

export function mapSeoMeshBlockPropsServer(node: JCRNodeWrapper): SeoMeshBlockPropsServer {
	return getCommunProps(node) as SeoMeshBlockPropsServer;
}

export function mapSeoMeshBlock(node: JCRNodeWrapper): BlockProps {
	const subBlockNodes = getChildNodesByType(node, "spnt:seoLinksSubBlock");
	const [leftNode, rightNode] = subBlockNodes;

	return {
		id: node.getIdentifier(),
		title: str(node, "blockTitle") || "",
		ctaProps: {
			type: "button",
			variant: "primary",
			label: str(node, "blockCtaTitle") || "",
			href: nodeUrl(node, "blockCtaTarget") || "#",
		} as CtaProps,
		linkSectionLeft: leftNode ? mapSeoMeshSection(leftNode) : undefined,
		linkSectionRight: rightNode ? mapSeoMeshSection(rightNode) : undefined,
	};
}
