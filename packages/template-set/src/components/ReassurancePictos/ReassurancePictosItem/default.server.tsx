import { jahiaComponent } from "@jahia/javascript-modules-library";
import { ReassurancePicto } from "sofinco-react";
import { imgUrl, str } from "#lib/jcr";

/**
 * `sofnt:reassurancePictosItem` — vue édition inline d'un picto.
 *
 * WYSIWYG : rend directement `<ReassurancePicto>` DS — le contributeur voit
 * exactement le rendu final. Le sous-composant fournit son propre `<li>`
 * (le wrapper de liste), donc **pas de `<li>` externe** à ajouter ici
 * (sinon HTML invalide `<li>` dans `<li>`).
 */
export default jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:reassurancePictosItem",
		displayName: "Picto Réassurance",
	},
	(_, { currentNode }) => {
		const icon = imgUrl(currentNode, "icon");
		const label = str(currentNode, "jcr:title");
		return <ReassurancePicto src={icon} label={label} />;
	},
);
