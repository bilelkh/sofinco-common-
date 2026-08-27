import { jahiaComponent } from "@jahia/javascript-modules-library";
import { isEditMode } from "#lib/renderContext";
import { mapFaqBlockPropsServer, mapFaqBlockPropsClient } from "./faqBlock.mapping";
import { renderFaqBlockClient, renderFaqBlockServer } from "./faqBlock.render";

export default jahiaComponent(
	{ nodeType: "sofnt:faq", displayName: "Faq", componentType: "view" },
	(_, { currentNode, renderContext }) => {
		const isEdit = isEditMode(renderContext);

		if (isEdit) {
			const props = mapFaqBlockPropsServer(currentNode);
			return renderFaqBlockServer(props);
		}

		const props = mapFaqBlockPropsClient(currentNode);
		return renderFaqBlockClient(props);
	},
);
