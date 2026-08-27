import { jahiaComponent } from "@jahia/javascript-modules-library";
import { ProductFocus } from "sofinco-react";
import { isEditMode } from "#lib/renderContext";
import { mapProductFocusProps } from "./productFocus.mapping";
import ProductFocusServer from "./views/ProductFocusServer";

/**
 * `sofnt:productFocus` — grille de caractéristiques produit autour d'une image
 * centrale. Features réparties en deux colonnes contribuables séparément
 * (`leftFeatures` / `rightFeatures`), chacune sous son propre wrapper JCR.
 *
 * Edit mode → <ProductFocusServer> : preview avec `<RenderChild>` pour chaque
 *   colonne, permettant l'édition inline des items.
 * Live mode → <ProductFocus> DS : rendu final SSR direct (aucun state).
 */
export default jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:productFocus",
		displayName: "Focus produit",
	},
	(_, { currentNode, renderContext }) => {
		const props = mapProductFocusProps(currentNode);

		if (isEditMode(renderContext)) {
			return <ProductFocusServer {...props} />;
		}

		return <ProductFocus {...props} />;
	},
);
