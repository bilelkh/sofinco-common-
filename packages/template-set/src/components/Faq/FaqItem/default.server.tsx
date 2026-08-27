import { jahiaComponent } from "@jahia/javascript-modules-library";
import { isEditMode } from "#lib/renderContext";
import { mapFaqItemServer } from "./faqItem.mapping";
import { renderFaqItemServer } from "./faqItem.render";

export default jahiaComponent(
	{ nodeType: "sofnt:faqItem", displayName: "Faq Item", componentType: "view" },
	(_, { currentNode, renderContext }) => {
		if (!isEditMode(renderContext)) return null;

		const props = mapFaqItemServer(currentNode);
		return renderFaqItemServer(props);
	},
);
