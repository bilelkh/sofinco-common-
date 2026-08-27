import { jahiaComponent } from "@jahia/javascript-modules-library";
import { mapComparisonOfferFeature } from "./comparisonOfferFeature.mapping";
import classes from "./comparisonOfferFeature.module.css";

/**
 * Standalone view for a single feature — only rendered in edit mode (inside
 * the offer's `RenderChild`). In live mode features are mapped into the
 * `OfferComparisonTable` Island props.
 */
export default jahiaComponent(
	{
		nodeType: "sofnt:comparisonOfferFeature",
		displayName: "Argument",
		componentType: "view",
	},
	(_, { currentNode }) => {
		const feature = mapComparisonOfferFeature(currentNode);
		return (
			<div className={classes.editFeature}>
				<span className={classes.editFeatureTag}>{feature.label}</span>
				<p className={classes.editFeatureText}>{feature.text}</p>
			</div>
		);
	},
);
