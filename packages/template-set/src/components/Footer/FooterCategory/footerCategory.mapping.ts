import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { FooterCategoryPropsServer } from "./footerCategory.types";
import type { FooterCategoryProps, FooterLinkProps } from "sofinco-react";
import { mapFooterLinkPropsClient } from "../FooterLink/footerLink.mapping";
import { str, getChildNodesByType } from "#lib/jcr";

export function mapFooterCategoryPropsClient(node: JCRNodeWrapper): FooterCategoryProps {
  let links: FooterLinkProps[] = [];

  try {
    const linkNodes = getChildNodesByType(node, "sofnt:footerLink");
    links = linkNodes.map((linkNode) => mapFooterLinkPropsClient(linkNode));
  } catch (e) {
    console.error("Erreur lors de la lecture des liens de la catégorie", e);
  }

  return {
    id: node.getIdentifier(),
    title: str(node, "jcr:title") || "Nouvelle catégorie",
    links
  };
}

export function mapFooterCategoryPropsServer(node: JCRNodeWrapper): FooterCategoryPropsServer {
  return {
    id: node.getIdentifier(),
    title: str(node, "jcr:title") || "Nouvelle catégorie"
  };
}
