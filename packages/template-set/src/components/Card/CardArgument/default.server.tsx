import { jahiaComponent } from "@jahia/javascript-modules-library";
import { mapCardArgumentProps } from "./cardArgument.mapping";
import { renderCardArgument } from "./cardArgument.render";

export default jahiaComponent(
	{ nodeType: "sofnt:cardArgument", displayName: "CardArgument", componentType: "view" },
	(_, { currentNode }) => {
		const props = mapCardArgumentProps(currentNode);

		return renderCardArgument(props);
	},
);
