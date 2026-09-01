import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { SeoMeshSectionPropsServer } from "./seoMeshSection.types";
import type { SeoMeshSection } from "sofinco-react";
import { str, getChildNodesByType } from "#lib/jcr";
import { readSeoLevel } from "../seoLevel";
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

export function mapSeoMeshSection(node: JCRNodeWrapper): SeoMeshSection {
	const linkNodes = getChildNodesByType(node, "spnt:seoLinksSubBlockLink");
	return {
		title: str(node, "subBlockTitle") || "",
		// `subBlockLevel` etait deja lu par la vue d'edition et jete par le rendu live : le
		// contributeur voyait son choix appliique en edition, puis ignore en production.
		// Valeur vide (choix « aucun ») → repli h3, le niveau code en dur jusqu'ici.
		titleAs: readSeoLevel(str(node, "subBlockLevel"), "h3"),
		links: linkNodes.map((linkNode) => mapSeoMeshLink(linkNode)),
	};
}
