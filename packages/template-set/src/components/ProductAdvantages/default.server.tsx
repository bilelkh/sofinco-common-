import { jahiaComponent } from "@jahia/javascript-modules-library";
import { isEditMode } from "#lib/renderContext";
import { mapProductAdvantagesProps } from "./productAdvantages.mapping";
import {
	renderProductAdvantagesServer,
	renderProductAdvantagesClient,
} from "./productAdvantages.render";

export default jahiaComponent(
	{
		nodeType: "sofnt:productAdvantages",
		displayName: "Avantages Produit",
		componentType: "view",
	},
	(_, { currentNode, renderContext }) => {
		const props = mapProductAdvantagesProps(currentNode);
		if (isEditMode(renderContext)) {
			return renderProductAdvantagesServer(props);
		}
		return renderProductAdvantagesClient(props);
	},
);
