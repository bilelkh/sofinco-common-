export type SubtitleProps = {
	children: React.ReactNode | string;
	as?: "p" | "h2" | "h3" | "h4" | "span";
	variant?: "dark" | "white";
	/**
	 * Échappatoire typographique, comme sur `Title` : une section dont la maquette
	 * ne suit pas l'échelle Monstera (le site vitrine B2B) surcharge ici plutôt
	 * que de viser le paragraphe par un sélecteur descendant, qui casserait au
	 * premier élément ajouté autour.
	 */
	className?: string;
	id?: string;
};
