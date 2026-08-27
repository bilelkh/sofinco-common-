import type { FooterSocialLinkPropsServer } from "./footerSocialLink.types";
import { FooterSocialLink } from "sofinco-react";
import type { FooterSocialLinkProps } from "sofinco-react";
import { FooterSocialLinkServer } from "./views/FooterSocialLinkServer";

export function renderFooterSocialLinkClient(props: FooterSocialLinkProps) {
	return <FooterSocialLink {...props} />;
}

export function renderFooterSocialLinkServer(props: FooterSocialLinkPropsServer) {
	return <FooterSocialLinkServer {...props} />;
}
