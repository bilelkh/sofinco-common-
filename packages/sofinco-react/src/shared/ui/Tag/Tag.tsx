import clsx from "clsx";
import type { TagProps } from "./tag.types";
import classes from "./tag.module.css";
import { FootnoteText } from "@shared/footnotes";

export function Tag({ children, className }: TagProps) {
	return (
		<span className={clsx(classes.tag, className)}>
			{/* Primitive partagée : on couvre ici plutôt qu'à chaque appel, comme pour
			    Title, Subtitle et SectionHeading. Passe-plat si les enfants ne sont pas
			    une chaîne. */}
			<FootnoteText>{children}</FootnoteText>
		</span>
	);
}
