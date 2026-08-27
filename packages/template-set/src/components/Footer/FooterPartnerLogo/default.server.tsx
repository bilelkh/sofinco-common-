import { jahiaComponent } from "@jahia/javascript-modules-library";
import { isEditMode } from "#lib/renderContext";
import {
	mapFooterPartnerLogoPropsServer,
	mapFooterPartnerLogoPropsClient,
} from "./footerPartnerLogo.mapping";
import {
	renderFooterPartnerLogoClient,
	renderFooterPartnerLogoServer,
} from "./footerPartnerLogo.render";

export default jahiaComponent(
	{ nodeType: "sofnt:partner", displayName: "Partner", componentType: "view" },
	(_, { currentNode, renderContext }) => {
		const isEdit = isEditMode(renderContext);

		if (isEdit) {
			const props = mapFooterPartnerLogoPropsServer(currentNode);
			return renderFooterPartnerLogoServer(props);
		}

		const props = mapFooterPartnerLogoPropsClient(currentNode);
		return renderFooterPartnerLogoClient(props);
	},
);
