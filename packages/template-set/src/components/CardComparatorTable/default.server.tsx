import { jahiaComponent } from "@jahia/javascript-modules-library";
import { isEditMode } from "#lib/renderContext";
import { mapCardComparatorTableProps } from "./cardComparatorTable.mapping";
import {
	renderCardComparatorTableServer,
	renderCardComparatorTableClient,
} from "./cardComparatorTable.render";

export default jahiaComponent(
	{
		nodeType: "sofnt:cardComparatorTable",
		displayName: "Comparateur de cartes",
		componentType: "view",
	},
	(_, { currentNode, renderContext }) => {
		const props = mapCardComparatorTableProps(currentNode);
		if (isEditMode(renderContext)) {
			return renderCardComparatorTableServer(props);
		}
		return renderCardComparatorTableClient(props);
	},
);
