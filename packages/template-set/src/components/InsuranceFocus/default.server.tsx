import { jahiaComponent } from "@jahia/javascript-modules-library";
import { InsuranceFocus } from "sofinco-react";
import { isEditMode } from "#lib/renderContext";
import { mapInsuranceFocusProps, mapInsuranceFocusServerProps } from "./insuranceFocus.mapping";
import InsuranceFocusServer from "./views/InsuranceFocusServer";

/**
 * `sofnt:insuranceFocus` — promo card with heading + description + image + CTA.
 *
 * Edit mode → <InsuranceFocusServer />: renders the DS + a warning banner
 *   when mandatory fields (`jcr:title`, `description`, `image`) are empty on
 *   a fresh autocreated node, pointing the contributor to the fields to
 *   fill.
 * Live mode → <InsuranceFocus {...props} />: direct DS render (no overhead).
 */
export default jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:insuranceFocus",
		displayName: "Focus assurance",
	},
	(_, { currentNode, renderContext }) => {
		const dsProps = mapInsuranceFocusProps(currentNode);

		if (isEditMode(renderContext)) {
			const serverProps = mapInsuranceFocusServerProps(dsProps);
			return <InsuranceFocusServer dsProps={dsProps} serverProps={serverProps} />;
		}

		return <InsuranceFocus {...dsProps} />;
	},
);
