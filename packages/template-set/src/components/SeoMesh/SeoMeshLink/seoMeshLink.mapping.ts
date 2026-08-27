import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { SeoMeshLinkPropsServer } from "./seoMeshLink.types";
import type { LinkProps } from "sofinco-react";
import { str, nodeUrl } from "#lib/jcr";

export function mapSeoMeshLinkPropsServer(node: JCRNodeWrapper): SeoMeshLinkPropsServer {
	return {
		title: str(node, "subLinkTargetTitle"),
		url: nodeUrl(node, "subLinkTarget"),
		ariaLabel: str(node, "ariaLabel"),
	};
}

export function mapSeoMeshLink(node: JCRNodeWrapper): LinkProps {
	return {
		id: node.getIdentifier(),
		href: nodeUrl(node, "subLinkTarget") || "#",
		label: str(node, "subLinkTargetTitle") || "",
	};
}
