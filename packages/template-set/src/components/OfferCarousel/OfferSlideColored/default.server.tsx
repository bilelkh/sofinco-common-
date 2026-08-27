import { jahiaComponent } from "@jahia/javascript-modules-library";
import { mapOfferSlideColoredProps } from "./offerSlideColored.mapping";
import { renderOfferSlideColoredServer } from "./offerSlideColored.render";

export default jahiaComponent(
	{
		nodeType: "sofnt:offerSlideColored",
		displayName: "Slide — Couleur de fond",
		componentType: "view",
	},
	(_, { currentNode }) => {
		const props = mapOfferSlideColoredProps(currentNode);
		return renderOfferSlideColoredServer(props);
	},
);
