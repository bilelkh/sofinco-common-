import type { JCRNodeWrapper } from "org.jahia.services.content";

import type { QrProps } from "sofinco-react";
import { str, imgUrl, getAsBoolean, getGlobalSettingsNode, nodeUrl } from "#lib/jcr";
import { qrCodePath } from "#lib/siteConfigs";
import { addCacheDependency, isEditMode } from "#lib/renderContext";

function mapQrProps(node: JCRNodeWrapper, t: (key: string) => string, isActive: boolean): QrProps {
	const label = str(node, "qrLabel") || t("qrSticker.defaultLabel");
	const props: QrProps = {
		text: label,
		src: imgUrl(node, "qrImageRef"),
		isActive: isActive,
		iosUrl: str(node, "iosUrl"),
		androidUrl: str(node, "androidUrl"),
		fallbackUrl: nodeUrl(node, "fallbackNode"),
		ctaLabelHeader: str(node, "appCtaLabelHeader") || "APP",
		ctaLabelFooter: str(node, "appCtaLabelFooter") || "Télécharger l'app.",
	};
	return props;
}

function getActiveProperties(currentNode: JCRNodeWrapper, nodeSetting: JCRNodeWrapper) {
	const isGlobalActive = getAsBoolean(nodeSetting, "isGlobalAppActive");
	const isLocalDisplay = getAsBoolean(currentNode, "isActive");

	return { isGlobalActive, isLocalDisplay };
}

function getQrNodeSetting(): JCRNodeWrapper | null {
	return getGlobalSettingsNode(qrCodePath);
}

export function mapQrStickerProps(node: JCRNodeWrapper, t: (key: string) => string): QrProps {
	// Dépendance sur le sofnt:qrSticker local (propriété `isActive`).
	// Le mapper reçoit `node` de son caller (via `getChildNode` ou équivalent)
	// donc la dep sur `node` lui-même n'est pas garantie côté helper — on la
	// déclare ici pour rendre le contrat explicite au niveau du mapper.
	// La dep sur `nodeSetting` global est portée par `getGlobalSettingsNode`.
	addCacheDependency({ node });

	const nodeSetting = getQrNodeSetting();
	const isEdit = isEditMode();

	let props: QrProps = {
		src: "",
		isActive: false,
	};
	if (nodeSetting) {
		const { isGlobalActive, isLocalDisplay } = getActiveProperties(node, nodeSetting);

		if (!isGlobalActive || (!isEdit && !isLocalDisplay)) return props;

		props = mapQrProps(nodeSetting, t, isGlobalActive && isLocalDisplay);
	}
	return props;
}
