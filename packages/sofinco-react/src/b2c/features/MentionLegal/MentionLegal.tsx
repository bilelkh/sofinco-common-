import { useState } from "react";
import type { MentionLegalProps } from "./mentionLegal.types";
import classes from "./mentionLegal.module.css";
import ChevronUp from "@shared/ui/svg/chevron-up";
import { sanitizeHtml } from "@utils/sanitizeHtml";
import { FootnoteText, footnoteDescribedBy } from "@shared/footnotes";

const CONTENT_ID = "mention-legal-content";

export function MentionLegal({ title, items, initiallyOpen = true }: MentionLegalProps) {
	// Constant initial value → identical server + first-client paint (SSR-safe, no React #418).
	const [isOpen, setIsOpen] = useState(initiallyOpen);

	return (
		<section className={classes["mention-legal"]}>
			<div className={classes["mention-legal__container"]}>
				<button
					type="button"
					className={classes["mention-legal__toggle"]}
					onClick={() => setIsOpen((open) => !open)}
					aria-expanded={isOpen}
					aria-controls={CONTENT_ID}
					aria-describedby={footnoteDescribedBy(title)}
				>
					<span className={classes["mention-legal__title"]}>
						<FootnoteText inert>{title}</FootnoteText>
					</span>
					<span
						className={`${classes["mention-legal__icon"]} ${isOpen ? "" : classes["mention-legal__icon--closed"]}`}
						aria-hidden="true"
					>
						<ChevronUp />
					</span>
				</button>

				<div
					id={CONTENT_ID}
					className={`${classes["mention-legal__items-wrapper"]} ${
						isOpen ? classes["mention-legal__items-wrapper--open"] : ""
					}`}
					aria-hidden={!isOpen}
				>
					<div className={classes["mention-legal__items"]}>
						{items.map((item, index) => (
							<div
								/*
								 * PRÉFIXE OBLIGATOIRE sur le repli. React convertit les clés en chaînes :
								 * un repli nu `index` produit "1", qui entre en collision avec le slug
								 * d'une mention dont l'ancre est « 1 ». Depuis que `anchor` est
								 * facultatif, « texte libre + note (1) » est le cas nominal — et deux
								 * enfants de même clé font réutiliser à React le mauvais nœud DOM, donc
								 * afficher à un paragraphe le HTML de son voisin.
								 *
								 * SÉPARATEUR `:` ET NON `-`, parce qu'un préfixe ne suffit pas : `mention-1`
								 * est un slug parfaitement atteignable, celui de l'ancre « Mention 1 ». Le
								 * repli reproduirait alors la collision qu'il existe pour empêcher. La
								 * slugification ne produit que `[a-z0-9_-]` — un `:` est donc, par
								 * construction, hors de son image.
								 */
								key={item.anchorId || `mention:${index}`}
								id={item.anchorId || undefined}
								className={classes["mention-legal__item"]}
								dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content) }}
							/>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
