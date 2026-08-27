import { jahiaComponent } from "@jahia/javascript-modules-library";
import { mapSeoMeshLinkPropsServer } from "./seoMeshLink.mapping";
import { SeoMeshLinkServer } from "./views/SeoMeshLinkServer";

export default jahiaComponent(
	{ nodeType: "spnt:seoLinksSubBlockLink", displayName: "SeoMeshLink", componentType: "view" },
	(_, { currentNode }) => <SeoMeshLinkServer {...mapSeoMeshLinkPropsServer(currentNode)} />,
);
