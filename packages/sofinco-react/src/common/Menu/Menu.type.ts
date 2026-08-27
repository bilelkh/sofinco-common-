import type { CtaProps } from "@shared/ui/Cta/Cta.type";
import type { LinkProps } from "@shared/ui/Link/Link.type";
import type { SearchProps } from "./Search/Search.type";
import { type TopBarProps } from "./TopBar/TopBar.type";

export type MenuProps = {
	className?: string;
	ctaDownloadApp?: CtaProps;
	/**
	 * URL App Store, prioritaire sur iPhone / iPad pour {@link ctaDownloadApp}. Résolue côté
	 * client après montage ; `ctaDownloadApp.href` reste le repli (SSR, desktop, autre OS).
	 */
	downloadAppHrefIos?: string;
	/** URL Play Store, prioritaire sur Android pour {@link ctaDownloadApp}. */
	downloadAppHrefAndroid?: string;
	ctaLogin?: CtaProps;
	ctaLoan?: CtaProps;
	ctaSearch?: CtaProps;
	linksPropsDesktop?: Array<LinkProps>;
	linksPropsMobile?: Array<LinkProps>;
	logo: MenuLogo;
	sections: Array<MenuSection>;
	children?: React.ReactNode;
	slotCtaMobile?: React.ReactNode;
	/**
	 * Search field as a pre-rendered node — used by Storybook and any plain-server host.
	 * Inside the Menu Island prefer {@link searchProps} (serializable data) instead: a
	 * server-rendered island slot can't be relocated across the mobile/desktop branch switch.
	 */
	slotSearch?: React.ReactNode;
	/** Serializable search config; `Menu` renders `<Search>` from it as part of its own tree. */
	searchProps?: SearchProps;
	topBarProps?: TopBarProps;
};

export type MenuLogo = {
	src: string;
	alt: string;
	label: string;
	href: string;
};

export type MenuSection = {
	id: string;
	title: string;
	subsections: Array<MenuSubSection>;
	card?: MenuSectionCard;
};

export type MenuSectionCard = {
	className?: string;
	title: string;
	image: string;
	variant?: "default" | "fullbg";
	cta?: CtaProps;
};

export type MenuSubSection = {
	id: string;
	title: string;
	links: Array<LinkProps>;
};
