import clsx from "clsx";
import type { BreadcrumbProps } from "./breadcrumb.type";
import classes from "./breadcrumb.module.css";
import { FootnoteText, footnoteDescribedBy } from "@shared/footnotes";

/**
 * Fil d'Ariane — composant DS partagé.
 *
 * Trois types de rendu par item :
 *
 *  - **Cliquable** (`isClickable: true`, `isCurrent: false`)
 *    → `<a href="...">` standard.
 *  - **Non-cliquable** (`isClickable: false`, `isCurrent: false`)
 *    → `<span>` non-cliquable. Cas : `jnt:navMenuText` ou URL vide.
 *  - **Page courante** (`isCurrent: true`)
 *    → `<span aria-current="page">`.
 *
 * Ce composant ne produit AUCUN balisage SEO. Le JSON-LD `BreadcrumbList` est émis
 * une seule fois par page, dans le `@graph` du `<head>`, à partir des mêmes items :
 * les URLs y sont absolues (Google les préfère) et la page courante y est désignée
 * par son canonical. Un second bloc rendu ici entrerait en concurrence avec lui.
 */
export function Breadcrumb({
	items,
	className,
	ariaLabel = "Fil d'Ariane",
	theme = "onLight",
}: BreadcrumbProps) {
	if (items.length === 0) return null;

	return (
		<nav aria-label={ariaLabel} className={clsx(classes.breadcrumb, className)} data-theme={theme}>
			<ol className={classes.list}>
				{items.map((item, index) => {
					const isLast = index === items.length - 1;
					const renderClickable = Boolean(item.isClickable && !item.isCurrent && item.url);

					return (
						<li key={item.id} className={classes.item}>
							{item.isCurrent ? (
								<span aria-current="page" className={classes.current}>
									<FootnoteText>{item.label}</FootnoteText>
								</span>
							) : renderClickable ? (
								<a
									href={item.url}
									className={classes.link}
									aria-describedby={footnoteDescribedBy(item.label)}
								>
									<FootnoteText inert>{item.label}</FootnoteText>
								</a>
							) : (
								<span className={classes.displayOnly}>
									<FootnoteText>{item.label}</FootnoteText>
								</span>
							)}
							{!isLast && (
								<span className={classes.separator} aria-hidden="true">
									›
								</span>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
