import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ScrollStepsItem } from "sofinco-react";
import { str, imgUrl, getChildNodesByType } from "#lib/jcr";

/**
 * Mapping JCR → DS pour une étape.
 *  - `title` vient de `jcr:title` (fourni par `mix:title`).
 *  - `imageAlt` alimente la carte d'édition (l'image live est décorative).
 *
 * Le `badge` (numéro d'étape) n'est PAS résolu ici : il dépend du rang de
 * l'étape dans la liste, connu seulement de {@link extractSteps}. En mode
 * édition, chaque étape est rendue isolément (sans position), donc sans badge.
 *
 * Unique mapping pour live ET édition : le rendu d'édition de chaque étape
 * passe par <RenderChildren> côté container, qui appelle `default.server.tsx`
 * de l'item — lequel utilise cette même fonction.
 */
export function mapHowItWorksStep(node: JCRNodeWrapper): ScrollStepsItem {
	return {
		id: node.getIdentifier(),
		title: str(node, "jcr:title"),
		description: str(node, "description"),
		imageUrl: imgUrl(node, "image"),
		imageAlt: str(node, "imageAlt"),
	};
}

/**
 * Extrait toutes les étapes enfants du container `sofnt:howItWorks`.
 * On utilise `getChildNodesByType` (et pas une JCR query) pour respecter
 * l'ordre contribué : Jahia conserve l'ordre des nodes filles, et le flag
 * `orderable` du CND permet à l'auteur de les réordonner par drag-and-drop.
 *
 * Le `badge` est dérivé du rang (1, 2, 3…) : <ScrollSteps> l'affiche tel quel
 * dans la pastille de numérotation. Aucune propriété JCR — l'ordre suffit.
 */
export function extractSteps(parent: JCRNodeWrapper): ScrollStepsItem[] {
	return getChildNodesByType(parent, "sofnt:howItWorksStep").map((node, index) => ({
		...mapHowItWorksStep(node),
		badge: index + 1,
	}));
}
