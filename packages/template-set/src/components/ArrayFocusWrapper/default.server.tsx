import { jahiaComponent } from "@jahia/javascript-modules-library";
import { ArrayFocusWrapper } from "sofinco-react";
import { isEditMode } from "#lib/renderContext";
import {
	mapArrayFocusWrapperProps,
	mapArrayFocusWrapperServerProps,
} from "./arrayFocusWrapper.mapping";
import ArrayFocusWrapperServer from "./views/ArrayFocusWrapperServer";

/**
 * `sofnt:arrayFocusWrapper` — grouping section combining ProductFocus + SeoBlock
 * + InsuranceFocus under a unified section header and background color.
 *
 * Both modes go through a dedicated mapper for a strict separation between
 * "read JCR / compute defaults" (mapper) and "render markup" (view) :
 *   Edit mode → mapArrayFocusWrapperServerProps → <ArrayFocusWrapperServer {...} />
 *   Live mode → mapArrayFocusWrapperProps       → <ArrayFocusWrapper {...} />
 */
export default jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:arrayFocusWrapper",
		displayName: "Section détails produit",
	},
	(_, { currentNode, renderContext }) => {
		if (isEditMode(renderContext)) {
			const props = mapArrayFocusWrapperServerProps(currentNode);
			return <ArrayFocusWrapperServer {...props} />;
		}
		const props = mapArrayFocusWrapperProps(currentNode);
		return <ArrayFocusWrapper {...props} />;
	},
);
