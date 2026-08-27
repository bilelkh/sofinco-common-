import { str, getAsBoolean, getGlobalSettingsNode, nodeUrl } from "./jcr";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { QrMobileProps } from "sofinco-react";

// 1. Correction de l'export et du nom du nœud JCR
export const qrCodePath = "qr-app-settings";
export const avisClientPath = "avis-clients-settings";
// Relative-to-site path of the spnt:configVerifedReview node populated by
// settings/groovyScripts/avis-verifie.groovy.
export const verifiedReviewConfigRelPath = "contents/config/avis-verifies/config";

// 2. J'ajoute " | null" au type de retour pour sécuriser le composant parent
export const getQrAppSettings = (site: JCRNodeWrapper): QrMobileProps | null => {
	const appConfig = getGlobalSettingsNode(qrCodePath, site);

	if (!appConfig) {
		return null;
	}

	const isGlobalAppActive = getAsBoolean(appConfig, "isGlobalAppActive", true);

	if (!isGlobalAppActive) {
		return null;
	}

	return {
		iosUrl: str(appConfig, "iosUrl"),
		androidUrl: str(appConfig, "androidUrl"),
		fallbackUrl: nodeUrl(appConfig, "fallbackNode"),
		ctaLabelHeader: str(appConfig, "appCtaLabelHeader") || "APP",
		ctaLabelFooter: str(appConfig, "appCtaLabelFooter") || "Télécharger l'app.",
	};
};
