import { jahiaComponent } from "@jahia/javascript-modules-library";
import { mapOfferSlideGlossyProps } from "./offerSlideGlossy.mapping";
import { renderOfferSlideGlossyServer } from "./offerSlideGlossy.render";

export default jahiaComponent(
	{
		nodeType: "sofnt:offerSlideGlossy",
		displayName: "Slide — Image de fond glossy",
		componentType: "view",
	},
	(_, { currentNode }) => {
		const props = mapOfferSlideGlossyProps(currentNode);
		return renderOfferSlideGlossyServer(props);
	},
);
