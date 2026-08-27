import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { FooterPropsServer } from "./footer.types.js";
import { str, imgUrl, getWrapperItems, getChildNode } from "#lib/jcr";
import { getHomePageUrl } from "#lib/renderContext";

import { mapQrStickerProps } from "#cms/QrSticker/qr.mapper";
import { mapAvisClientsStickerPropsClient } from "#cms/AvisClientsSticker/avisClientsSticker.mapping";

import type { FooterProps, QrProps } from "sofinco-react";
import type { AvisClientsStickerProps } from "sofinco-react";

import { mapFooterPartnerLogoPropsClient } from "../FooterPartnerLogo/footerPartnerLogo.mapping";
import { mapFooterCategoryPropsClient } from "../FooterCategory/footerCategory.mapping";
import { mapFooterSocialLinkPropsClient } from "../FooterSocialLink/footerSocialLink.mapping";
import { mapFooterLinkPropsClient } from "../FooterLink/footerLink.mapping";

export function mapFooterPropsClient(
	node: JCRNodeWrapper,
	t: (key: string) => string,
): FooterProps {
	const partnersNodes = getWrapperItems(node, "sofnt:partnerList", "sofnt:partner");
	const categoriesNodes = getWrapperItems(node, "sofnt:categoryLinkList", "sofnt:categoryLink");
	const socialLinksNodes = getWrapperItems(node, "sofnt:socialLinkList", "sofnt:socialLink");
	const legalLinksNodes = getWrapperItems(node, "sofnt:linkList", "sofnt:footerLink");

	const qrNode = getChildNode(node, "qrCode");
	const avisNode = getChildNode(node, "avisClients");

	const qrCode: QrProps | undefined = qrNode ? mapQrStickerProps(qrNode, t) : undefined;
	const avisClients: AvisClientsStickerProps | undefined = avisNode
		? mapAvisClientsStickerPropsClient(avisNode, t)
		: undefined;

	return {
		mainLogoUrl: imgUrl(node, "mainLogo") || "",
		mainLogoAlt: str(node, "mainLogoAlt") || t("footer.mainLogoAlt"),
		mainLogoLinkUrl: str(node, "mainLogoLink") || getHomePageUrl(),

		socialTitle: str(node, "socialTitle") || t("footer.followUs"),
		bottomSubtitle: str(node, "bottomSubtitle"),
		legalMention: str(node, "legalMention"),

		qrCode,
		avisClientData: avisClients,

		partners: partnersNodes.map((child) => mapFooterPartnerLogoPropsClient(child)),
		categories: categoriesNodes.map((child) => mapFooterCategoryPropsClient(child)),
		socialLinks: socialLinksNodes.map((child) => mapFooterSocialLinkPropsClient(child)),
		legalLinks: legalLinksNodes.map((child) => mapFooterLinkPropsClient(child)),
	};
}

export function mapFooterPropsServer(
	node: JCRNodeWrapper,
	t: (key: string) => string,
): FooterPropsServer {
	return {
		mainLogoUrl: imgUrl(node, "mainLogo"),
		bottomSubtitle: str(node, "bottomSubtitle"),
		legalMention: str(node, "legalMention"),
		socialTitle: str(node, "socialTitle"),
		partnersTitle: t("footer.partnersTitle"),
		categoryLinkTitle: t("footer.categoryLinkTitle"),
		moreInfosTitle: t("footer.moreInfosTitle"),
	};
}
