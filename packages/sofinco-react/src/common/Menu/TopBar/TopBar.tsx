/*
 * NAVIGATION — aucun renvoi de note dans ce fichier.
 *
 * Un renvoi de note se rattache à une allégation commerciale : un taux, une durée, une
 * condition. Les libellés de ce fichier sont des DESTINATIONS, pas des allégations — un
 * marqueur y serait une erreur de contribution, pas un cas d'usage. Enveloppés, ils ne
 * produisaient de toute façon aucun lien : imbriqué dans un <a>, `FootnoteText` ne rend
 * que la marque, en `aria-hidden`.
 *
 * Les surfaces PROMOTIONNELLES du menu, elles, restent enveloppées : voir
 * `Desktop/components/Card/Card.tsx`, qui porte une offre et son CTA.
 */
/* eslint-disable sofinco/require-footnote-text -- libellés de navigation, jamais des allégations */
import clsx from "clsx";

import { type TopBarProps } from "./TopBar.type";
import styles from "./TopBar.module.css";

export default function TopBar({ className, tabs = [], slotSearch, children }: TopBarProps) {
	return (
		<>
			<div className={clsx(styles["top-bar"], className)}>
				{tabs.length > 0 && (
					<ul className={styles["top-bar__tabs"]}>
						{tabs.map((tab) => (
							<li
								key={tab.href}
								className={clsx(
									styles["top-bar__tab"],
									tab.isActive && styles["top-bar__tab--active"],
								)}
							>
								<a
									href={tab.href}
									target={tab.target}
									aria-label={tab.ariaLabel}
									data-tracking={tab.tracking?.event ? JSON.stringify(tab.tracking) : undefined}
								>
									{tab.label}
								</a>
							</li>
						))}
					</ul>
				)}
				{slotSearch && <div className={styles["top-bar__search"]}>{slotSearch}</div>}
			</div>
			{children}
		</>
	);
}
