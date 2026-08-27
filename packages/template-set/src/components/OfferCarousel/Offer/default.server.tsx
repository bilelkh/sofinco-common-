import { jahiaComponent } from "@jahia/javascript-modules-library";
import { isEditMode } from "#lib/renderContext";
import { mapOfferProps } from "./offer.mapping";
import { renderOfferServer, renderOfferClient } from "./offer.render";

export default jahiaComponent(
	{
		nodeType: "sofnt:offer",
		displayName: "Carrousel d'Offres",
		componentType: "view",
	},
	(_, { currentNode, renderContext }) => {
		const isEdit = isEditMode(renderContext);
		const props = mapOfferProps(currentNode);
		if (isEdit) {
			return renderOfferServer(props);
		}
		return renderOfferClient(props);
	},
);
