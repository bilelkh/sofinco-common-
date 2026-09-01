import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { SeoMeshBlockPropsServer } from "./seoMeshBlock.types";
import type { BlockProps, CtaProps } from "sofinco-react";
import { str, nodeUrl, getChildNodesByType } from "#lib/jcr";
import { mapSeoMeshSection } from "../SeoMeshSection/seoMeshSection.mapping";
import { readSeoLevel } from "../seoLevel";

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
		// Meme correctif que pour les sections : `blockTitleLevel` etait ignore en live, ou le
		// composant codait `as="h2"`. On garde h2 comme repli, donc aucun changement visible
		// pour les blocs deja contribues sans niveau explicite.
		titleAs: readSeoLevel(str(node, "blockTitleLevel"), "h2"),
		// Pas de `titleStyle` ici. L'apparence reste constante quel que soit le niveau — c'est
		// le decouplage qui permet de descendre dans le plan SEO sans rapetisser le titre a
		// l'ecran — mais cette constante appartient au COMPOSANT, qui la porte deja
		// (`visualStyle={titleStyle ?? "h2"}` dans Block.tsx). La redire ici creait deux
		// sources pour une meme decision, qui pouvaient diverger sans que rien ne le signale.
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
