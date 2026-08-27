import { jahiaComponent } from "@jahia/javascript-modules-library";
import { mapFooterLinkPropsClient } from "./footerLink.mapping";
import { renderFooterNav } from "./footerLink.render";

export default jahiaComponent(
	{ nodeType: "sofnt:footerLink", displayName: "FooterLink", name: "nav", componentType: "view" },
	(_, { currentNode }) => {
		const props = mapFooterLinkPropsClient(currentNode);
		return renderFooterNav(props);
	},
);
