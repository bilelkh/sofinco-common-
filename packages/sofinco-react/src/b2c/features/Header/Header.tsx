import clsx from "clsx";

import { type HeaderProps } from "./Header.type";
import styles from "./Header.module.css";

export default function Header({ className, alert, menu, mobileAppButton, hero }: HeaderProps) {
	return (
		<>
			{alert}
			{/*
			 * The <header> is the sticky "headroom" element. It must be a short block whose
			 * parent is the full-page container (body in Jahia, #storybook-root in Storybook)
			 * so position: sticky can stay pinned across the whole scroll. Hero / alert /
			 * mobile button therefore live OUTSIDE it, in normal flow.
			 */}
			<header className={clsx(styles["header"], className)} data-sof-sticky-header>
				<div className={styles["header__menu"]}>{menu}</div>
			</header>
			{mobileAppButton && <div className={styles["header__mobile-app"]}>{mobileAppButton}</div>}
			{hero && <div className={styles["header__hero"]}>{hero}</div>}
		</>
	);
}
