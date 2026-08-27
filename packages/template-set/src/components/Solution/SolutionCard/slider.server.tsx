import { jahiaComponent } from "@jahia/javascript-modules-library";
import { SolutionCard } from "sofinco-react";
import { toSolutionSliderCardProps } from "./solutionCard.mapping";

/**
 * Vue edit-mode d'une carte dans le contexte SLIDER (`sofnt:solutionSlider`).
 *
 * Selectionnee par le parent via `<RenderChildren view="slider" />`. Jahia
 * autorise plusieurs vues par type de noeud : c'est le mecanisme prevu pour
 * qu'un meme `sofnt:solutionCard` s'affiche differemment selon son parent.
 *
 * On reutilise directement le composant DS <SolutionCard> :
 *  - il est exporte par le barrel `sofinco-react`
 *  - il est purement presentationnel (aucun `window`, `useState` ni `useEffect`)
 *    donc rendable en SSR/GraalVM sans risque de "window is not defined"
 *
 * Benefice : l'apercu de contribution est identique au rendu public, et suivra
 * automatiquement toute evolution du design system — zero dette de duplication.
 */
export default jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:solutionCard",
		name: "slider",
		displayName: "Carte solution — apercu slider",
	},
	(_, { currentNode, renderContext }) => {
		// En live, le parent `sofnt:solutionSlider` mappe lui-meme ses cartes
		// et rend une Island unique : cette vue ne sert qu'a l'edition.
		if (!renderContext.isEditMode()) return null;
		return <SolutionCard {...toSolutionSliderCardProps(currentNode)} />;
	},
);
