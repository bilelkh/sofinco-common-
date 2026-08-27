import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { FooterSocialLinkPropsServer } from "./footerSocialLink.types";
import type { FooterSocialLinkProps, SocialNetworkType } from "sofinco-react";
import { str } from "#lib/jcr";

export function mapFooterSocialLinkPropsClient(node: JCRNodeWrapper): FooterSocialLinkProps {
  return {
    id: node.getIdentifier(),
    network: (str(node, "network") as SocialNetworkType) || "facebook",
    url: str(node, "url") || "#"
  };
}

export function mapFooterSocialLinkPropsServer(node: JCRNodeWrapper): FooterSocialLinkPropsServer {
  return mapFooterSocialLinkPropsClient(node) as FooterSocialLinkPropsServer;
}
