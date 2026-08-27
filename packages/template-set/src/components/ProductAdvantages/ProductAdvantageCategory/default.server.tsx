import { jahiaComponent } from "@jahia/javascript-modules-library";
import { ProductAdvantageSlide } from "sofinco-react";
import { mapProductAdvantageCategory } from "./productAdvantageCategory.mapping";

/**
 * Standalone view for a single category — only rendered in edit mode (inside the
 * parent's `RenderChild`). In live mode the parent maps categories into props and
 * hands them to the hydrated `ProductAdvantages` Island.
 */
export default jahiaComponent(
	{
		nodeType: "sofnt:productAdvantageCategory",
		displayName: "Catégorie d'avantage",
		componentType: "view",
	},
	(_, { currentNode }) => {
		const category = mapProductAdvantageCategory(currentNode);
		return <ProductAdvantageSlide {...category} />;
	},
);
