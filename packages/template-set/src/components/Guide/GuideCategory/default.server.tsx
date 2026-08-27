import { jahiaComponent } from "@jahia/javascript-modules-library";
import { isEditMode } from "#lib/renderContext";
import { mapGuideCategoryServer } from "./guideCategory.mapping";
import { GuideCategoryServer } from "./views/GuideCategoryServer";

export default jahiaComponent(
	{ nodeType: "sofnt:guideCategory", displayName: "Guide — Categorie", componentType: "view" },
	(_, { currentNode, renderContext }) => {
		if (!isEditMode(renderContext)) return null;
		return <GuideCategoryServer {...mapGuideCategoryServer(currentNode)} />;
	},
);
