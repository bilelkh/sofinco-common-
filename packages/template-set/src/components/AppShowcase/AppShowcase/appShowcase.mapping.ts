import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { AppShowcaseProps } from "./appShowcase.types";
import type { QrProps, AppMobileProps, AppMobileCard } from "sofinco-react";
import { str, getChildNodesByType, getChildNode, imgUrl } from "#lib/jcr";
import { addCacheDependency } from "#lib/renderContext";
import { mapAppShowcaseFeatureProps } from "../AppShowcaseFeature/appShowcaseFeature.mapping";
import { mapQrStickerProps } from "#cms/QrSticker/qr.mapper";
import { readTitleLevel, readTitleStyle } from "#cms/Shared/HeadingStyle/headingStyle.mapping";

function getCommonProps(node: JCRNodeWrapper) {
	return {
		backgroundColor: str(node, "backgroundColor") || "blueDark",
		mainIconUrl: imgUrl(node, "mainIcon"),
		title: str(node, "jcr:title") || "",
		subtitle: str(node, "subtitle") || "",
		// Construit ICI parce que `getCommonProps` sert les DEUX vues : l'apercu d'edition lit
		// encore title/subtitle a plat, le rendu live consomme l'objet groupe.
		sectionHeadingProps: {
			title: str(node, "jcr:title") || "",
			subtitle: str(node, "subtitle") || undefined,
			titleAs: readTitleLevel(node),
			visualStyle: readTitleStyle(node),
		},
		mobileImageUrl: imgUrl(node, "mobileImage"),
	};
}

export function mapAppShowcasePropsServer(node: JCRNodeWrapper): AppShowcaseProps {
	return getCommonProps(node) as AppShowcaseProps;
}

export function mapAppMobilePropsClient(
	node: JCRNodeWrapper,
	t: (key: string) => string,
): AppMobileProps {
	const featureNodes = getChildNodesByType(node, "sofnt:appShowcaseFeature");

	// `getChildNode` auto-déclare la dépendance sur le nœud résolu.
	// Cas null (child mandatory supprimé) : on garde une dep sur le path attendu
	// pour que la recréation future de l'enfant invalide bien ce fragment.
	const qrNode = getChildNode(node, "qrCode");
	if (!qrNode) {
		addCacheDependency({ path: `${node.getPath()}/qrCode` });
	}

	const qrCode: QrProps | null = qrNode ? mapQrStickerProps(qrNode, t) : null;
	const commonProps = getCommonProps(node);

	return {
		picto: commonProps.mainIconUrl,
		backgroundColor: commonProps.backgroundColor,
		sectionHeadingProps: commonProps.sectionHeadingProps,
		// Le composant n'affiche qu'une seule image — `mobileImage` est la source unique.
		img: commonProps.mobileImageUrl || "",

		// Extraction des infos depuis le mapping du QR Code
		imgQrCode: qrCode?.src,
		mobileCtaHrefIos: qrCode?.iosUrl,
		mobileCtaHrefAndroid: qrCode?.androidUrl,

		// Mapping des enfants vers le format "AppMobileCard"
		cards: featureNodes.slice(0, 4).map((child: JCRNodeWrapper, index: number) => {
			const feature = mapAppShowcaseFeatureProps(child);

			return {
				id: index,
				label: feature.featureTitle,
				labelAs: feature.featureTitleAs,
				labelComplement: feature.featureText,
				picto: feature.iconUrl,
			} as AppMobileCard;
		}),
	};
}
