import type { ReactNode } from "react";

export interface FormHeroProps {
	/**
	 * Titre du bandeau — piloté par Jahia. Chaîne plutôt que `ReactNode` : la
	 * valeur vient d'un champ de contenu, et `Title` sait y rendre les renvois
	 * de notes de bas de page (`⁽¹⁾`).
	 */
	title: string;
	/** Accroche sous le titre — pilotée par Jahia. */
	subtitle?: string;
	/**
	 * Niveau du titre. `h1` par défaut : le bandeau ouvre la page. À passer en
	 * `h2` seulement si la page porte déjà son `h1` ailleurs.
	 */
	titleAs?: "h1" | "h2";
	/**
	 * Contenu chevauchant le bas du bandeau — le formulaire, dans la maquette.
	 * Le chevauchement appartient au bandeau et non à l'appelant : lui seul
	 * connaît la hauteur dont il faut remonter la carte.
	 */
	children?: ReactNode;
	className?: string;
}
