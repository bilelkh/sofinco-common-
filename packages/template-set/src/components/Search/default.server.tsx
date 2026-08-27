import { Island, jahiaComponent } from "@jahia/javascript-modules-library";
import SearchJahia from "./SearchJahia.client";
import { mapSearchProps } from "./search.mapping";

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:search",
	},
	(_, { currentNode }) => {
		return <Island component={SearchJahia} props={mapSearchProps(currentNode)} />;
	},
);
