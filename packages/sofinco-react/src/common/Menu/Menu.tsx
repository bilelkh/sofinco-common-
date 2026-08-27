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
import { useRef } from "react";
import type { MenuProps } from "@common/Menu/Menu.type";

import Sections from "./Desktop/components/Sections/Sections";
import MenuMobile from "./Mobile/MenuMobile";
import Link from "@shared/ui/Link";
import Cta from "@shared/ui/Cta/Cta";
import Image from "@shared/ui/Image";
import TopBar from "./TopBar/TopBar";
import Search from "./Search/Search";

import { MEDIUM_DOWN_QUERY, useMediaQuery } from "@shared/hooks/useMediaQuery";
import useHideOnScroll from "@shared/hooks/useHideOnScroll";
import useMobileAppHref from "@b2c/features/AppMobile/ui/useMobileAppHref";
import clsx from "clsx";

import styles from "./Menu.module.css";

const Menu = ({
	className,
	ctaLogin,
	ctaLoan,
	ctaDownloadApp,
	downloadAppHrefIos,
	downloadAppHrefAndroid,
	linksPropsDesktop,
	linksPropsMobile,
	logo,
	sections,
	slotSearch,
	searchProps,
	topBarProps,
}: MenuProps) => {
	const mainClassName = clsx(styles.menu, className);

	const menuRef = useRef<HTMLDivElement>(null);
	useHideOnScroll(menuRef);

	const isMobile = useMediaQuery(MEDIUM_DOWN_QUERY);

	// CTA « Télécharger l'app » : sur mobile, l'URL store suit l'OS du visiteur. La résolution
	// n'a lieu qu'après montage (snapshot serveur = `href` contribué dans le NavMenu), le hook
	// est donc appelé inconditionnellement — avant le branchement mobile / desktop.
	const downloadAppHref = useMobileAppHref({
		hrefIos: downloadAppHrefIos,
		hrefAndroid: downloadAppHrefAndroid,
		fallbackHref: ctaDownloadApp?.href,
	});

	// Render the search inside the Menu's own tree (not as a nested island slot) so it survives
	// the mobile/desktop branch switch. `slotSearch` (a pre-rendered node) wins when provided
	// (Storybook / plain-server hosts); otherwise build it from serializable `searchProps`.
	const search = slotSearch ?? (searchProps ? <Search {...searchProps} /> : undefined);

	if (isMobile) {
		return (
			<>
				<div className={mainClassName} ref={menuRef}>
					<div className={styles.menu__inner}>
						<MenuMobile ctaProps={ctaLoan} links={linksPropsMobile ?? []} sections={sections}>
							<>
								{/* Pas de `ctaDownloadApp` = libellé vide ou kill switch app global : le bouton
								    disparaît. Sans ce garde, `Cta` retomberait sur sa branche <button> et
								    rendrait une pastille vide, sans nom accessible. */}
								{ctaDownloadApp && (
									<Cta
										{...ctaDownloadApp}
										href={downloadAppHref}
										className={clsx(styles.menu__cta)}
										variant="accent"
									/>
								)}
								<Cta {...ctaLogin} className={clsx(styles.menu__cta)} />
							</>
						</MenuMobile>
						<a href={logo.href} className={styles.menu__logo}>
							<Image src={logo.src} alt={logo.alt ?? ""} width={446} height={101} />
							<span className={styles["sr-only"]}>{logo.label}</span>
						</a>
					</div>
					{search}
					{ctaLogin && (
						<Cta
							{...ctaLogin}
							className={clsx(styles.menu__login)}
							variant="ghost"
							iconOnly
							iconLeft="single"
						/>
					)}
				</div>
			</>
		);
	}

	return (
		<TopBar {...topBarProps} slotSearch={search}>
			<div className={mainClassName} ref={menuRef}>
				<div className={styles.menu__inner}>
					<a href={logo.href} className={styles.menu__logo}>
						<Image src={logo.src} alt={logo.alt ?? ""} width={446} height={101} />
						<span className={styles["sr-only"]}>{logo.label}</span>
					</a>
					<Sections sections={sections} />
				</div>
				<div className={styles.menu__actions}>
					<div className={styles.menu__links}>
						{linksPropsDesktop?.map((link) => (
							<Link key={link.href} {...link} />
						))}
					</div>
					{ctaLogin && (
						<Cta {...ctaLogin} size="medium" variant="accent" className={styles.menu__cta__login} />
					)}
				</div>
			</div>
		</TopBar>
	);
};

export default Menu;
