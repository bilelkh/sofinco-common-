import type { HeadingLevel, TitleProps, TitleTag } from "./Title.type";
import clsx from "clsx";
import { FootnoteText } from "@shared/footnotes";

import styles from "./Title.module.css";

/**
 * Styles typographiques RÉELLEMENT définis dans `Title.module.css`.
 *
 * Le design system n'expose que quatre échelles. `h5` / `h6` n'en ont jamais eu — pas plus que
 * l'ancien site, qui découplait le niveau sémantique d'une échelle de tailles indépendante.
 */
const STYLED_LEVELS = new Set<string>(["h1", "h2", "h3", "h4"]);

/**
 * Classe d'apparence à appliquer — le point qui rendait des titres invisiblement nus.
 *
 * L'ancien calcul était `visualStyle ?? Component` : dès que la balise n'avait pas de classe
 * homonyme, `styles["title--h5"]` valait `undefined` et le titre sortait SANS AUCUNE
 * typographie. Tant que `as` était contraint à h1–h4 le cas était impossible ; l'ouverture du
 * vocabulaire à h5/h6/p/span/div l'a rendu atteignable.
 *
 * Deux intentions distinctes, donc deux replis :
 *  - `h5` / `h6` — l'auteur veut un TITRE, plus profond dans le plan. On rend la plus petite
 *    échelle disponible plutôt que rien.
 *  - `p` / `span` / `div` — l'auteur veut « un titre qui n'en est pas un ». Aucune typographie
 *    de titre : c'est exactement ce que faisait le legacy quand le niveau était vide.
 */
function resolveVisualClass(
	visualStyle: HeadingLevel | "none" | undefined,
	tag: TitleTag,
): string | false {
	if (visualStyle === "none") return false;

	const requested = visualStyle ?? tag;
	if (STYLED_LEVELS.has(requested)) return styles[`title--${requested}`];

	// Niveau de titre sans échelle propre (h5/h6) → la plus petite existante.
	if (requested === "h5" || requested === "h6") return styles["title--h4"];

	// Balise non-titre sans style demandé → texte courant.
	return false;
}

const Title = ({
	children,
	as: Component = "h2",
	visualStyle,
	variant = "dark",
	className,
	id,
}: TitleProps) => {
	const mainClassName = clsx(
		styles.title,
		resolveVisualClass(visualStyle, Component),
		styles[`title--${variant}`],
		className,
	);

	return (
		<Component className={mainClassName} id={id}>
			{/* Un titre peut porter un renvoi `⁽¹⁾` : rendu ici en lien, côté React, donc
			    compatible avec l'hydratation d'un Island. Passe-plat si non-string. */}
			<FootnoteText>{children}</FootnoteText>
		</Component>
	);
};

export default Title;
