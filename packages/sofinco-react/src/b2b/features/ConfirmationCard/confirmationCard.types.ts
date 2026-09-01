import type { ReactNode } from "react";

import type { IconKey } from "@shared/ui/svg";

/** Une puce de réassurance : une icône du DS, un libellé court. */
export interface ConfirmationReassurance {
	icon: IconKey;
	label: string;
}

export interface ConfirmationCardProps {
	/**
	 * Titre de la carte — piloté par Jahia. Chaîne plutôt que `ReactNode` : la
	 * valeur vient d'un champ de contenu, et les renvois de notes (`⁽¹⁾`) y sont
	 * rendus par `FootnoteText`.
	 */
	title: string;
	/** Message de confirmation sous le titre — piloté par Jahia. */
	message?: ReactNode;
	/**
	 * Puces de réassurance sous le message. Omises, les trois puces du parcours
	 * partenaire sont rendues (cf. `DEFAULT_REASSURANCES`) : c'est le cas courant,
	 * et la seule maquette existante. Un tableau vide les retire.
	 */
	reassurances?: readonly ConfirmationReassurance[];
	className?: string;
}
