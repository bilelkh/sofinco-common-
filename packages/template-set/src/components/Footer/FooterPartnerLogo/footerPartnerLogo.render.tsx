import type { FooterPartnerLogoPropsServer } from "./footerPartnerLogo.types";
import { FooterPartnerLogo } from "sofinco-react";
import type { FooterPartnerLogoProps } from "sofinco-react";
import { FooterPartnerLogoServer } from "./views/FooterPartnerLogoServer";

export function renderFooterPartnerLogoClient(props: FooterPartnerLogoProps) {
	return <FooterPartnerLogo {...props} />;
}

export function renderFooterPartnerLogoServer(props: FooterPartnerLogoPropsServer) {
	return <FooterPartnerLogoServer {...props} />;
}
