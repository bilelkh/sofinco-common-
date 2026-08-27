import { jahiaComponent } from "@jahia/javascript-modules-library";
import { mapSeoMeshBlockPropsServer } from "./seoMeshBlock.mapping";
import { SeoMeshBlockServer } from "./views/SeoMeshBlockServer";

export default jahiaComponent(
	{ nodeType: "spnt:seoLinksBlock", displayName: "SeoMeshBlock", componentType: "view" },
	(_, { currentNode }) => <SeoMeshBlockServer {...mapSeoMeshBlockPropsServer(currentNode)} />,
);
