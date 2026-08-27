import { jahiaComponent } from "@jahia/javascript-modules-library";

import { isEditMode } from "#lib/renderContext";

import { renderHeroViewServer, renderHeroViewClient } from "./hero.render";
import { mapHeroProps, mapHeroPropsServer } from "./hero.mapper";
import type { HeroProps } from "./hero.types";
import type { HeroProps as HeroClientProps } from "sofinco-react";

export default jahiaComponent(
	{ nodeType: "sofnt:hero", displayName: "Hero", componentType: "view" },
	(_, { currentNode, renderContext }) => {
		if (isEditMode(renderContext)) {
			const props: HeroProps = mapHeroPropsServer(currentNode);
			return renderHeroViewServer(props);
		}
		const props: HeroClientProps = mapHeroProps(currentNode);
		return renderHeroViewClient(props);
	},
);
