import { jahiaComponent } from "@jahia/javascript-modules-library";

import type { QrProps } from "sofinco-react";
import { mapQrStickerProps } from "./qr.mapper";
import CM from "./views/cm";
import { useAppTranslation } from "#lib/i18n";

export default jahiaComponent(
	{ nodeType: "sofnt:qrSticker", displayName: "Hero QR Sticker", componentType: "view" },
	(_, { currentNode }) => {
		const { t } = useAppTranslation();
		const props: QrProps = mapQrStickerProps(currentNode, t);
		if (!props.src) return null;
		return <CM {...props} />;
	},
);
