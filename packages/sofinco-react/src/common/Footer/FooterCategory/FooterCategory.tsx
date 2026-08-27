import type { FooterCategoryProps } from "./footerCategory.types";
import classes from "./footerCategory.module.css";
import { FooterLink } from "../FooterLink/FooterLink";
import ChevronUp from "@shared/ui/svg/chevron-up";
import { FootnoteText, footnoteDescribedBy } from "@shared/footnotes";

export function FooterCategory({ title, links }: FooterCategoryProps) {
	// On crée un ID unique basé sur le titre pour relier le label à la checkbox
	const safeId = `accordion-${title.replace(/\s+/g, "-").toLowerCase()}`;

	return (
		<div className={classes.footerCategory}>
			<input
				type="checkbox"
				id={safeId}
				className={classes.footerCategory__toggle}
				aria-hidden="true"
			/>

			<label
				htmlFor={safeId}
				className={classes.footerCategory__title}
				// Conteneur cliquable : renvoi rendu inerte et masqué, note rattachée en description.
				aria-describedby={footnoteDescribedBy(title)}
			>
				<FootnoteText inert>{title}</FootnoteText>
				<span className={classes.footerCategory__icon}>
					<ChevronUp />
				</span>
			</label>

			<ul className={classes.footerCategory__linkList}>
				{links?.map((link) => (
					<li key={link.id}>
						<FooterLink {...link} />
					</li>
				))}
			</ul>
		</div>
	);
}
