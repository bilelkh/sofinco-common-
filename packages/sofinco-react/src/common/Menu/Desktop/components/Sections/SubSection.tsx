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
import type { MenuSection, MenuSubSection } from "@common/Menu/Menu.type";

import styles from "./Sections.module.css";
import ArrowRight from "@/shared/ui/svg/arrow-right";

const SubSection = ({ section }: { section: MenuSection }) => {
	return (
		<div className={styles.menu__subsectionswrapper}>
			{section.subsections.map((item: MenuSubSection) => (
				<div className={styles.menu__subsection} key={item.id}>
					{/* The title sits outside the <ul>: `ul` only permits `li`/`script`/`template`,
					    and this markup now ships in the SSR HTML where malformed lists get
					    reparented by the crawler, breaking the heading↔list association. */}
					<span role="heading" aria-level={2} className={styles.menu__subsection__title}>
						{item.title}
					</span>
					<ul className={styles.menu__subsection__list}>
						{item.links.map((link) => {
							const trackingAttr = link.tracking?.event ? JSON.stringify(link.tracking) : undefined;
							return (
								<li className={styles.menu__subsection__link} key={`${link.href}-${link.label}`}>
									<a href={link.href} data-tracking={trackingAttr}>
										{link.label}
									</a>
									<span className={styles.menu__subsection__link__icon} aria-hidden="true">
										<ArrowRight size="large" color="primary" />
									</span>
								</li>
							);
						})}
					</ul>
				</div>
			))}
		</div>
	);
};

export default SubSection;
