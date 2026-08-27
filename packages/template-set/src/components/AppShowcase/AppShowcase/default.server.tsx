import { jahiaComponent } from "@jahia/javascript-modules-library";
import { useAppTranslation } from "#lib/i18n";
import { isEditMode } from "#lib/renderContext";
import { mapAppShowcasePropsServer, mapAppMobilePropsClient } from "./appShowcase.mapping";
import { renderAppShowcaseClient, renderAppShowcaseServer } from "./appShowcase.render";

export default jahiaComponent(
	{ nodeType: "sofnt:appShowcase", displayName: "AppShowcase", componentType: "view" },
	(_, { currentNode, renderContext }) => {
		const { t } = useAppTranslation();
		const isEdit = isEditMode(renderContext);

		if (isEdit) {
			const props = mapAppShowcasePropsServer(currentNode);
			return renderAppShowcaseServer(props);
		}

		const props = mapAppMobilePropsClient(currentNode, t);
		return renderAppShowcaseClient(props);
	},
);
