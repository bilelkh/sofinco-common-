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
	return (
		<Modal slotCtaMobile={children}>
			<nav className={clsx(styles.menuMobile, className)}>
				<Tabs tabs={tabs}>
					{sections.map((item) => (
						<Accordion key={item.title} content={item.subsections} />
					))}
				</Tabs>
				<div className={styles.menuMobile__links}>
					{links.map((link) => (
						<Link key={link.href} {...link} />
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
