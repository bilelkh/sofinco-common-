import { jahiaComponent } from "@jahia/javascript-modules-library";
import { isEditMode } from "#lib/renderContext";
import { mapOfferComparisonTableProps } from "./offerComparisonTable.mapping";
import {
	renderOfferComparisonTableServer,
	renderOfferComparisonTableClient,
} from "./offerComparisonTable.render";

export default jahiaComponent(
	{
		nodeType: "sofnt:offerComparisonTable",
		displayName: "Comparatif d'offres",
		componentType: "view",
	},
	(_, { currentNode, renderContext }) => {
		const props = mapOfferComparisonTableProps(currentNode);
		if (isEditMode(renderContext)) {
			return renderOfferComparisonTableServer(props);
		}
		return renderOfferComparisonTableClient(props);
	},
);
