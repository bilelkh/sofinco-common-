import { jahiaComponent } from "@jahia/javascript-modules-library";
import { SectionCarte } from "sofinco-react";
import { isEditMode } from "#lib/renderContext";
import { mapSectionCarteProps } from "./sectionCarte.mapping";
import { SectionCarteServer } from "./views/SectionCarteServer";

/**
 * `sofnt:sectionCarte` — section "Carte Sofinco" (photo + bloc avantages + CTA).
 *
 * Composant server-only : aucune interactivité client dans le DS SectionCarte,
 * donc pas d'<Island>. En édition on rend un aperçu compact avec placeholders
 * pour les champs obligatoires manquants ; en live le composant DS directement.
 */
export default jahiaComponent(
	{
		nodeType: "sofnt:sectionCarte",
		displayName: "Section Carte Sofinco",
		componentType: "view",
	},
	(_, { currentNode, renderContext }) => {
		const props = mapSectionCarteProps(currentNode);

		if (isEditMode(renderContext)) {
			return <SectionCarteServer {...props} />;
		}
		return <SectionCarte {...props} />;
	},
);
