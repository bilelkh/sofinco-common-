import { jahiaComponent } from "@jahia/javascript-modules-library";
import { Cta } from "sofinco-react";
import { getRequiredCtaProps } from "#lib/cta";

/**
 * Standalone view for a column CTA. Rendered via `RenderChild` so contributors can
 * edit the button in edit mode; the live table renders the CTA from the mapped props.
 */
export default jahiaComponent(
	{
		nodeType: "sofnt:comparativeTableButton",
		displayName: "Bouton de colonne",
		componentType: "view",
	},
	(_, { currentNode }) => {
		const variant = currentNode.getName() === "leftColumnButton" ? "primary" : "accent";
		const cta = getRequiredCtaProps(currentNode, "comparative-table-cta", variant);
		return <Cta {...cta} />;
	},
);
