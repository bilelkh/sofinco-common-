import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { SeoMeshWrapperPropsServer } from "./seoMeshWrapper.types";
import type { SeoMeshProps } from "sofinco-react";
import { str, getChildNodesByType, num } from "#lib/jcr";
import { mapSeoMeshBlock } from "../SeoMeshBlock/seoMeshBlock.mapping";

function getCommunProps(node: JCRNodeWrapper) {
	return {
		title: str(node, "jcr:title"),
		backgroundColor: str(node, "backgroundColor"),
		maxSections: num(node, "maxSections") || 2,
		maxLinksPerSection: num(node, "maxLinksPerSection") || 6,
	};
}

export function mapSeoMeshWrapperPropsServer(node: JCRNodeWrapper): SeoMeshWrapperPropsServer {
	return getCommunProps(node) as SeoMeshWrapperPropsServer;
}

export function mapSeoMeshProps(node: JCRNodeWrapper): SeoMeshProps {
	const blockNodes = getChildNodesByType(node, "spnt:seoLinksBlock");
	return {
		...(getCommunProps(node) as unknown as SeoMeshProps),
		blocks: blockNodes.map((child) => mapSeoMeshBlock(child)),
	};
}
