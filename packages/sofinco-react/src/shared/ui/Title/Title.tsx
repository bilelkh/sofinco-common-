import type { TitleProps } from "./Title.type";
import clsx from "clsx";
import { FootnoteText } from "@shared/footnotes";

import styles from "./Title.module.css";

const Title = ({
	children,
	as: Component = "h2",
	visualStyle,
	variant = "dark",
	className,
	id,
}: TitleProps) => {
	const visualVariant = visualStyle ?? Component;

	const mainClassName = clsx(
		styles.title,
		visualStyle !== "none" && styles[`title--${visualVariant}`],
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
