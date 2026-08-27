import { jahiaComponent } from "@jahia/javascript-modules-library";
import { AvisClientsSticker } from "sofinco-react";
import { mapAvisClientsStickerPropsClient } from "./avisClientsSticker.mapping";
import { useAppTranslation } from "#lib/i18n";

export default jahiaComponent(
	{
		nodeType: "sofnt:avisClientsSticker",
		displayName: "AvisClientsSticker",
		componentType: "view",
		properties: {
			"cache.mainResource": "true",
			"cache.expiration": "3600",
		},
	},
	(_, { currentNode }) => {
		const { t } = useAppTranslation();
		const props = mapAvisClientsStickerPropsClient(currentNode, t);
		return <AvisClientsSticker {...props} />;
	},
);
