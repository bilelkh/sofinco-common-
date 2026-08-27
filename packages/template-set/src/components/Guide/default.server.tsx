import { jahiaComponent } from "@jahia/javascript-modules-library";
import { Guide } from "sofinco-react";
import { isEditMode } from "#lib/renderContext";
import { mapGuidePropsServer, mapGuidePropsClient } from "./guide.mapping";
import { GuideServer } from "./views/GuideServer";

export default jahiaComponent(
	{ nodeType: "sofnt:guide", displayName: "Guide", componentType: "view" },
	(_, { currentNode, renderContext }) => {
		if (isEditMode(renderContext)) {
			return <GuideServer {...mapGuidePropsServer(currentNode)} />;
		}
		return <Guide {...mapGuidePropsClient(currentNode)} />;
	},
);
