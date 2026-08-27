import { jahiaComponent } from "@jahia/javascript-modules-library";
import { Pill } from "sofinco-react";
import { mapComparatorFeature } from "./comparatorFeature.mapping";

/**
 * Standalone view for a single feature — only rendered in edit mode (inside the
 * card's `RenderChild`). Mirrors the pill the React `ComparatorCard` renders in live.
 */
export default jahiaComponent(
	{
		nodeType: "sofnt:comparatorFeature",
		displayName: "Caractéristique",
		componentType: "view",
	},
	(_, { currentNode }) => {
		const feature = mapComparatorFeature(currentNode);
		return <Pill label={feature.label} icon={feature.included === false ? "x-round" : "check"} />;
	},
);
