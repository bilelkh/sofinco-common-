import { jahiaComponent } from "@jahia/javascript-modules-library";
import { mapFooterLinkPropsClient } from "./footerLink.mapping";
import { renderFooterLinkClient } from "./footerLink.render";

export default jahiaComponent(
	{ nodeType: "sofnt:footerLink", displayName: "FooterLink", componentType: "view" },
	(_, { currentNode }) => {
		const props = mapFooterLinkPropsClient(currentNode);
		return renderFooterLinkClient(props);
	},
);
