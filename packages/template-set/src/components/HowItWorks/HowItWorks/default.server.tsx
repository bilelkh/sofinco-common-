import { jahiaComponent } from "@jahia/javascript-modules-library";
import { isEditMode } from "#lib/renderContext";
import { useAppTranslation } from "#lib/i18n";
import { mapHowItWorksPropsClient, mapHowItWorksPropsServer } from "./howItWorks.mapping";
import { renderHowItWorksClient, renderHowItWorksServer } from "./howItWorks.render";

export default jahiaComponent(
	{
		nodeType: "sofnt:howItWorks",
		displayName: "How It Works",
		componentType: "view",
	},
	(_, { currentNode, renderContext }) => {
		const { t } = useAppTranslation();

		if (isEditMode(renderContext)) {
			const props = mapHowItWorksPropsServer(currentNode);
			return renderHowItWorksServer(props);
		}

		const props = mapHowItWorksPropsClient(currentNode, t);
		return renderHowItWorksClient(props);
	},
);
