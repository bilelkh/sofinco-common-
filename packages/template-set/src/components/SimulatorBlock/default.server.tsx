import { jahiaComponent, Island } from "@jahia/javascript-modules-library";
import { SimulatorBlock } from "sofinco-react";

import { useAppTranslation } from "#lib/i18n";
import { mapSimulatorBlockProps } from "./simulatorBlock.mapping";
import SimulatorBlockJahia from "./SimulatorBlockJahia.client";

export default jahiaComponent(
	{
		nodeType: "sofnt:simulatorBlock",
		displayName: "Simulateur (bandeau)",
		componentType: "view",
	},
	(_, { currentNode, renderContext }) => {
		const { t } = useAppTranslation();
		const props = mapSimulatorBlockProps(currentNode, renderContext, t);
		if (renderContext.isEditMode()) {
			return <SimulatorBlock {...props} />;
		}
		return <Island component={SimulatorBlockJahia} props={props} />;
	},
);
