import { jahiaComponent } from "@jahia/javascript-modules-library";
import { isEditMode } from "#lib/renderContext";
import { useAppTranslation } from "#lib/i18n";
import { mapVideoBlockProps } from "./videoBlock.mapping";
import { renderVideoBlockClient, renderVideoBlockServer } from "./videoBlock.render";

export default jahiaComponent(
	{
		nodeType: "sofnt:videoBlock",
		displayName: "Bloc Vidéo",
		componentType: "view",
	},
	(_, { currentNode, renderContext }) => {
		const { t } = useAppTranslation();
		const props = mapVideoBlockProps(currentNode, t);

		if (isEditMode(renderContext)) {
			return renderVideoBlockServer(props);
		}
		return renderVideoBlockClient(props);
	},
);
