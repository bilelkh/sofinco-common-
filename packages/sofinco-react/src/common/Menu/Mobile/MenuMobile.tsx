import { useState } from "react";

import Tabs from "./components/Tabs/Tabs";
import Accordion from "./components/Accordion/Accordion";
import Modal from "./components/Modal/Modal";
import Link from "@shared/ui/Link";
import Cta from "@shared/ui/Cta/Cta";

import { type MenuMobileProps } from "./MenuMobile.type";

import clsx from "clsx";

import styles from "./MenuMobile.module.css";

const MenuMobile = ({ ctaProps, links, sections, className, children }: MenuMobileProps) => {
	const tabs = sections.map((section) => section.title);

	/*
	 * État repris à Radix pour pouvoir refermer le menu depuis un lien.
	 *
	 * Les liens de navigation referment le menu en changeant de page. Ceux qui portent
	 * `closesMenu` n'emmènent nulle part — ils ouvrent une surface PAR-DESSUS (le panneau
	 * « Aide & Contact » de Smart Tribune) — et laisseraient sinon ce dialogue modal ouvert
	 * derrière elle. Deux modales concurrentes, dont l'une piège le focus : voir la garde
	 * `onInteractOutside` de `Modal`, qui est l'autre cicatrice du même conflit.
	 */
	const [open, setOpen] = useState(false);

	return (
		<Modal open={open} onOpenChange={setOpen} slotCtaMobile={children}>
			<nav className={clsx(styles.menuMobile, className)}>
				<Tabs tabs={tabs}>
					{sections.map((item) => (
						<Accordion key={item.title} content={item.subsections} />
					))}
				</Tabs>
				<div className={styles.menuMobile__links}>
					{links.map((link) => (
						<Link
							key={link.href}
							{...link}
							onClick={link.closesMenu ? () => setOpen(false) : undefined}
						/>
					))}
				</div>
				{ctaProps && (
					<div className={styles.menuMobile__cta}>
						<Cta {...ctaProps} />
					</div>
				)}
			</nav>
		</Modal>
	);
};

export default MenuMobile;
