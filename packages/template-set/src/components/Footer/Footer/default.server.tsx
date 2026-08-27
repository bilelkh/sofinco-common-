import { jahiaComponent } from "@jahia/javascript-modules-library";
import { useAppTranslation } from "#lib/i18n";
import { mapFooterPropsServer, mapFooterPropsClient } from "./footer.mapping";
import { renderFooterClient, renderFooterServer } from "./footer.render";
import { isMainResourceNode, isEditMode } from "#lib/renderContext";

export default jahiaComponent(
	{ nodeType: "sofnt:footer", displayName: "Footer Principal", componentType: "view" },
	(_, { currentNode, renderContext }) => {
		const { t } = useAppTranslation();

		if (isEditMode(renderContext) && isMainResourceNode(renderContext, "footer")) {
			const props = mapFooterPropsServer(currentNode, t);
			return renderFooterServer(props);
		}

		const props = mapFooterPropsClient(currentNode, t);
		return renderFooterClient(props);
	},
);
