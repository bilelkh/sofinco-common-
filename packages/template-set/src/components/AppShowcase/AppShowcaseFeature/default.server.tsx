import { jahiaComponent } from "@jahia/javascript-modules-library";
import { mapAppShowcaseFeatureProps } from "./appShowcaseFeature.mapping";
import { renderAppShowcaseFeatureServer } from "./appShowcaseFeature.render";

export default jahiaComponent(
	{
		nodeType: "sofnt:appShowcaseFeature",
		displayName: "AppShowcaseFeature",
		componentType: "view",
	},
	(_, { currentNode }) => {
		const props = mapAppShowcaseFeatureProps(currentNode);

		return renderAppShowcaseFeatureServer(props);
	},
);
