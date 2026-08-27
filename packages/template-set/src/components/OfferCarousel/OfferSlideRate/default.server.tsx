import { jahiaComponent } from "@jahia/javascript-modules-library";
import { mapOfferSlideRateProps } from "./offerSlideRate.mapping";
import { renderOfferSlideRateServer } from "./offerSlideRate.render";

export default jahiaComponent(
	{
		nodeType: "sofnt:offerSlideRate",
		displayName: "Slide — Taux / Mensualités",
		componentType: "view",
	},
	(_, { currentNode }) => {
		const props = mapOfferSlideRateProps(currentNode);
		return renderOfferSlideRateServer(props);
	},
);
