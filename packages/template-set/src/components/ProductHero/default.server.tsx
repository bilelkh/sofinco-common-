import { jahiaComponent, Island } from "@jahia/javascript-modules-library";
import { isEditMode } from "#lib/renderContext";
import { useAppTranslation } from "#lib/i18n";
import { HeroPP } from "sofinco-react";
import { mapProductHeroProps } from "./productHero.mapping";
import ProductHeroClient from "./views/ProductHeroClient.client";

export default jahiaComponent(
	{
		nodeType: "sofnt:productHero",
		displayName: "Hero Produit",
		componentType: "view",
	},
	(_, { currentNode, renderContext }) => {
		const { t } = useAppTranslation();
		const props = mapProductHeroProps(currentNode, renderContext, t);

		if (isEditMode(renderContext)) {
			return <HeroPP {...props} />;
		}

		return <Island component={ProductHeroClient} props={props} />;
	},
);
