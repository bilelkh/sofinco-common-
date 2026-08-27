import { jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";

// 1. Le dictionnaire d'architecture : Associe chaque type de Liste à son type d'Enfant
const listToChildMap = {
	"sofnt:partnerList": "sofnt:partner",
	"sofnt:categoryLinkList": "sofnt:categoryLink",
	"sofnt:linkList": "sofnt:footerLink",
	"sofnt:socialLinkList": "sofnt:socialLink",
} as const;

export default jahiaComponent(
	{
		nodeType: "sofnt:listBase",
		componentType: "view",
		displayName: "Vue Transparente de Liste",
	},
	(_, { currentNode }) => {
		const currentType = currentNode.getPrimaryNodeTypeName();

		const allowedNodeType = listToChildMap[currentType as keyof typeof listToChildMap];

		if (allowedNodeType) {
			return <RenderChildren nodeTypes={[allowedNodeType]} />;
		}

		return <RenderChildren />;
	},
);
