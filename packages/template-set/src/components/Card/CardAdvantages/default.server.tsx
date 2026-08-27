import { jahiaComponent } from "@jahia/javascript-modules-library";
import { isEditMode } from "#lib/renderContext";
import {
	mapCardAdvantagesPropsClient,
	mapCardAdvantagesPropsServer,
} from "./cardAdvantages.mapping";
import { renderCardAdvantagesClient, renderCardAdvantagesServer } from "./cardAdvantages.render";

export default jahiaComponent(
	{ nodeType: "sofnt:cardAdvantages", displayName: "CardAdvantages", componentType: "view" },
	(_, { currentNode, renderContext }) => {
		const isEdit = isEditMode(renderContext);

		if (isEdit) {
			const props = mapCardAdvantagesPropsServer(currentNode);
			return renderCardAdvantagesServer(props);
		}

		const props = mapCardAdvantagesPropsClient(currentNode);
		return renderCardAdvantagesClient(props);
	},
);
