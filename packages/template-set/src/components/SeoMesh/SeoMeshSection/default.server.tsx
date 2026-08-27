import { jahiaComponent } from "@jahia/javascript-modules-library";
import { mapSeoMeshSectionPropsServer } from "./seoMeshSection.mapping";
import { SeoMeshSectionServer } from "./views/SeoMeshSectionServer";

export default jahiaComponent(
	{ nodeType: "spnt:seoLinksSubBlock", displayName: "SeoMeshSection", componentType: "view" },
	(_, { currentNode }) => <SeoMeshSectionServer {...mapSeoMeshSectionPropsServer(currentNode)} />,
);
