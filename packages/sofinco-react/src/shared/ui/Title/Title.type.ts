/**
 * Niveaux de titre — et RIEN d'autre.
 *
 * Ce sont les seules valeurs qui portent une sémantique de titre, donc les seules qui ont un
 * sens comme APPARENCE. Séparé de {@link TitleTag} parce que les deux axes étaient confondus :
 * `visualStyle` acceptait `"p"`, `"span"`, `"div"` — des balises qui ne désignent aucun style.
 */
export type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

/**
 * Balise réellement posée dans le DOM.
 *
 * Un contributeur SEO doit pouvoir dire « ce texte ressemble à un titre mais n'en est pas un » :
 * c'est le rôle de `p`. `span` / `div` couvrent les cas d'imbrication où un titre est interdit
 * (dans un `<summary>`, dans un `<button>`).
 */
export type TitleTag = HeadingLevel | "p" | "span" | "div";

export type TitleProps = {
	children: React.ReactNode | string;
	/** Balise émise. Sémantique uniquement — n'influence l'apparence qu'à défaut de `visualStyle`. */
	as?: TitleTag;
	/** Apparence, indépendante de la balise. `"none"` = aucune typographie de titre. */
	visualStyle?: HeadingLevel | "none";
	variant?: "dark" | "white" | "eyebrow";
	className?: string;
	id?: string;
};
