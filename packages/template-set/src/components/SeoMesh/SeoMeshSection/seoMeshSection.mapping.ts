import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { SeoMeshSectionPropsServer } from "./seoMeshSection.types";
import type { LinkProps } from "sofinco-react";
import { str, getChildNodesByType } from "#lib/jcr";
import { mapSeoMeshLink } from "../SeoMeshLink/seoMeshLink.mapping";

function getCommunProps(node: JCRNodeWrapper) {
	return {
		title: str(node, "subBlockTitle") || "",
		level: str(node, "subBlockLevel"),
	};
}

export function mapSeoMeshSectionPropsServer(node: JCRNodeWrapper): SeoMeshSectionPropsServer {
	return getCommunProps(node) as SeoMeshSectionPropsServer;
}

export function mapSeoMeshSection(node: JCRNodeWrapper): { title: string; links: LinkProps[] } {
	const linkNodes = getChildNodesByType(node, "spnt:seoLinksSubBlockLink");
	return {
		title: str(node, "subBlockTitle") || "",
		links: linkNodes.map((linkNode) => mapSeoMeshLink(linkNode)),
	};
}
