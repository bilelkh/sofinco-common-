import { jahiaComponent } from "@jahia/javascript-modules-library";
import { isEditMode } from "#lib/renderContext";
import { mapFooterCategoryPropsServer } from "./footerCategory.mapping";

import { renderFooterCategoryClient, renderFooterCategoryServer } from "./footerCategory.render";

export default jahiaComponent(
	{ nodeType: "sofnt:categoryLink", displayName: "Catégorie des liens", componentType: "view" },
	(_, { currentNode, renderContext }) => {
		const isEdit = isEditMode(renderContext);

		const props = mapFooterCategoryPropsServer(currentNode);
		if (isEdit) {
			return renderFooterCategoryServer(props);
		}
		return renderFooterCategoryClient(props);
	},
);
