import { jahiaComponent } from "@jahia/javascript-modules-library";
import { ProductFocusItem } from "sofinco-react";
import { mapProductFocusItem } from "./productFocusItem.mapping";

/**
 * Standalone view for a single item — rendered in edit mode inside each of
 * the parent's `<RenderChild name="leftFeatures" | "rightFeatures" />`. In
 * live mode items are mapped into the DS props by `mapProductFocusProps`.
 */
export default jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:productFocusItem",
		displayName: "Focus produit — item",
	},
	(_, { currentNode }) => {
		const { label, description } = mapProductFocusItem(currentNode);
		return <ProductFocusItem label={label} description={description} />;
	},
);
