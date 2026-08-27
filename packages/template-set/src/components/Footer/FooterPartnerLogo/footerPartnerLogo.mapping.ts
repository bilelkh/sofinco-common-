import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { FooterPartnerLogoPropsServer } from "./footerPartnerLogo.types";
import type { FooterPartnerLogoProps } from "sofinco-react";
import { str, imgUrl, getAsBoolean } from "#lib/jcr"; // Assurez-vous d'avoir exporté 'bool'

export function mapFooterPartnerLogoPropsClient(node: JCRNodeWrapper): FooterPartnerLogoProps {
  return {
    id: node.getIdentifier(),
		title: str(node, "jcr:title"),
    imageUrl: imgUrl(node, "logoImage"),
    altText: str(node, "jcr:title"),
    linkUrl: str(node, "linkUrl"),
    openInNewTab: getAsBoolean(node, "openInNewTab", true),
    disclaimer: str(node, "disclaimer")
  };
}

export function mapFooterPartnerLogoPropsServer(node: JCRNodeWrapper): FooterPartnerLogoPropsServer {
  return mapFooterPartnerLogoPropsClient(node) as FooterPartnerLogoPropsServer;
}
