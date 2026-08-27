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
import { Root, Trigger, Content, Item, Header } from "@radix-ui/react-accordion";
import clsx from "clsx";
import Link from "@shared/ui/Link";

import { type AccordionProps } from "./Accordion.type";
import styles from "./Accordion.module.css";
import ChevronUp from "@shared/ui/svg/chevron-up";

const Accordion = ({ className, content }: AccordionProps) => {
	const mainClassName = clsx(styles.menu__accordion, className);
	return (
		<Root type="single" className={mainClassName} collapsible>
			{content.map((item, index) => (
				<Item
					className={styles.menu__accordion__item}
					value={item.title + `--${index}`}
					key={item.title + `--${index}`}
					role="heading"
					aria-level={2}
				>
					<Header className={styles.menu__accordion__header}>
						<Trigger
							className={styles.menu__accordion__trigger}
							// Conteneur cliquable : renvoi rendu inerte et masqué, note rattachée en description.
						>
							{item.title}
							<span className={styles.menu__accordion__icon} aria-hidden>
								<ChevronUp />
							</span>
						</Trigger>
					</Header>
					<Content className={styles.menu__accordion__content}>
						<ul className={styles.menu__accordion__linkwrapper}>
							{item.links.map((link, linkIndex) => (
								<li key={link.label + `--${linkIndex}`}>
									<Link
										href={link.href}
										label={link.label}
										className={styles.menu__accordion__link}
										tracking={link.tracking}
									/>
								</li>
							))}
						</ul>
					</Content>
				</Item>
			))}
		</Root>
	);
};

export default Accordion;
