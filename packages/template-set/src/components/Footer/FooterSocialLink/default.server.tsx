import { jahiaComponent } from "@jahia/javascript-modules-library";
import { isEditMode } from "#lib/renderContext";
import {
	mapFooterSocialLinkPropsServer,
	mapFooterSocialLinkPropsClient,
} from "./footerSocialLink.mapping";
import {
	renderFooterSocialLinkClient,
	renderFooterSocialLinkServer,
} from "./footerSocialLink.render";

export default jahiaComponent(
	{ nodeType: "sofnt:socialLink", displayName: "SocialLink", componentType: "view" },
	(_, { currentNode, renderContext }) => {
		const isEdit = isEditMode(renderContext);

		if (isEdit) {
			const props = mapFooterSocialLinkPropsServer(currentNode);
			return renderFooterSocialLinkServer(props);
		}

		const props = mapFooterSocialLinkPropsClient(currentNode);
		return renderFooterSocialLinkClient(props);
	},
);
