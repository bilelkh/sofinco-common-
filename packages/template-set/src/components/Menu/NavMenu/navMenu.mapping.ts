import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type {
	CtaProps,
	LinkProps,
	MenuProps,
	MenuSection,
	MenuSubSection,
	MenuSectionCard,
	SearchProps,
	TopBarProps,
} from "sofinco-react";
import { getAsBoolean, getChildNode, getChildNodesByType, getPropertyAsNode, str } from "#lib/jcr";
import { getHomePageUrl } from "#lib/renderContext";
import { readLink, readPrefixedLink } from "#shared/Link/readLink";
import { getCtaProps } from "#lib/cta";
import { getQrAppSettings } from "#lib/siteConfigs";
import {
	buildSmartPushLink,
	mapSmartPushConfig,
	type SmartPushConfig,
} from "#cms/Faq/SmartPush/smartPush.mapping";
import { mapTopBarTabs } from "../TabMenu/tabMenu.mapping";
import { mapSearchProps } from "#cms/Search/search.mapping";

/** Result of mapping a `sofnt:navMenu` node. */
export interface NavMenuData {
	/** Serializable props consumed by the Menu Island (`MenuJahia.client`). */
	data: MenuProps;
	/** Shared Smart Tribune PUSH config when the `Aide & Contact` widget is enabled, else `null`. */
	smartPushConfig: SmartPushConfig | null;
}

/** Maps a single `sofnt:menuNodeLink` to a section link. */
function mapSectionLink(
	linkNode: JCRNodeWrapper,
	navSectionTitle: string,
	navLinkTitle: string,
): MenuSubSection["links"][number] {
	const linkedNode = getPropertyAsNode(linkNode, "j:linknode");
	const label = str(linkNode, "jcr:title");
	return {
		href: linkedNode ? buildNodeUrl(linkedNode) : "#",
		label,
		tracking: {
			event: "click_menu",
			menu_level_1: navSectionTitle,
			menu_level_2: navLinkTitle,
			menu_level_3: label,
		},
	};
}

/** Maps a `sofnt:navSection` (with its side card) to a `MenuSection`. */
function mapSection(navSection: JCRNodeWrapper): MenuSection {
	const navSectionTitle = str(navSection, "jcr:title");

	const subsections: MenuSubSection[] = getChildNodesByType(navSection, "sofnt:navLink").map(
		(navLink): MenuSubSection => {
			const navLinkTitle = str(navLink, "jcr:title");
			return {
				id: navLink.getIdentifier(),
				title: navLinkTitle,
				links: getChildNodesByType(navLink, "sofnt:menuNodeLink").map((linkNode) =>
					mapSectionLink(linkNode, navSectionTitle, navLinkTitle),
				),
			};
		},
	);

	const sideImg = getPropertyAsNode(navSection, "sideImg");
	const sidePage = getPropertyAsNode(navSection, "sidePage");
	const ctaLabel = str(navSection, "titleCta") || "En savoir plus";
	const card: MenuSectionCard | undefined = sideImg
		? {
				title: str(navSection, "sideTitle"),
				image: buildNodeUrl(sideImg),
				cta: sidePage
					? {
							type: "button",
							variant: "accent",
							label: ctaLabel,
							href: buildNodeUrl(sidePage),
							tracking: {
								event: "click_menu",
								menu_level_1: navSectionTitle,
								menu_level_2: "",
								menu_level_3: "",
								banner_cta: ctaLabel,
							},
							ctaSection: "navmenu-section-card-cta",
						}
					: undefined,
			}
		: undefined;

	return {
		id: navSection.getIdentifier(),
		title: navSectionTitle,
		subsections,
		card,
	};
}

/** Projects a resolved link node into the `LinkProps` shape used by the menu's `mon espace` list. */
function toMySpaceLink(linkNode: JCRNodeWrapper): LinkProps[] {
	const link = readLink(linkNode);
	if (!link) return [];
	return [
		{
			href: link.href,
			label: link.label,
			isExternal: link.target === "_blank",
			iconLeft: link.iconLeft,
			iconRight: link.iconRight,
			iconVariant: link.iconVariant,
			tracking: {
				event: "click_menu_myspace",
				menu_level_1: link.label,
			},
		},
	];
}

/**
 * Maps a `sofnt:navMenu` node into the serializable {@link MenuProps} consumed by the Menu
 * Island, plus the optional Smart Tribune PUSH config. Pure JCR→DTO logic extracted from
 * `default.server.tsx` so it stays unit-testable (the `.tsx` server file is coverage-excluded).
 *
 * @param currentNode the `sofnt:navMenu` node
 * @param logo        the menu logo node (`logo` prop on the component), may be `null`
 * @param site        the current site node, used to resolve the shared Smart Tribune PUSH config
 */
export function mapNavMenuProps(
	currentNode: JCRNodeWrapper,
	logo: JCRNodeWrapper | null,
	site: JCRNodeWrapper | null,
): NavMenuData {
	const sections: MenuSection[] = getChildNodesByType(currentNode, "sofnt:navSection").map(
		mapSection,
	);

	const mySpaceNode = getChildNode(currentNode, "mySpace");
	const mySpaceLinks: LinkProps[] = mySpaceNode
		? getChildNodesByType(mySpaceNode, "sofnt:link").flatMap(toMySpaceLink)
		: [];

	// Sur mobile, les onglets du tabMenu marqués `mobile = true` sont remontés
	// en bas de la liste "mon espace".
	const tabMenuNode = getChildNode(currentNode, "tabMenu");
	const mobileMenuLinks: LinkProps[] = tabMenuNode
		? getChildNodesByType(tabMenuNode, "sofnt:menuLink")
				.filter((menuLink) => getAsBoolean(menuLink, "mobile"))
				.flatMap(toMySpaceLink)
		: [];

	// Bouton "Aide & Contact" (widget Smart Tribune PUSH), piloté par le booléen
	// `showSmartPush` du nœud mySpace et la config partagée `spnt:smartPush`. Rendu comme
	// un Link (icône à gauche) appendu aux liens mySpace ; le script injecté plus bas
	// intercepte son clic et ouvre la popup.
	const showSmartPush = mySpaceNode ? getAsBoolean(mySpaceNode, "showSmartPush") : false;
	const smartPushConfig = showSmartPush ? mapSmartPushConfig(site) : null;
	const smartPushLink: LinkProps | null = smartPushConfig ? buildSmartPushLink() : null;

	const desktopLinks: LinkProps[] = smartPushLink ? [...mySpaceLinks, smartPushLink] : mySpaceLinks;
	const mySpaceLinksMobile: LinkProps[] = smartPushLink
		? [...mySpaceLinks, ...mobileMenuLinks, smartPushLink]
		: [...mySpaceLinks, ...mobileMenuLinks];

	// CTA "télécharger l'app" : le navMenu ne contribue QUE le libellé (`sofmix:downloadApp`).
	// Toutes les destinations — URLs stores ET page de repli — viennent de la config de site
	// `sofnt:qrAppSettings` (nœud `qr-app-settings`), source unique déjà utilisée par le
	// QrSticker, le bouton app du Header et le bloc AppShowcase.
	//
	// Libellé vide → pas de bouton, et on ne lit même pas la config de site.
	// `isGlobalAppActive = false` sur la config → `getQrAppSettings` renvoie `null`, ce qui
	// masque aussi le bouton : c'est le kill switch global de l'app.
	const downloadAppLabel = str(currentNode, "downloadAppLabel");
	const qrAppSettings = downloadAppLabel && site ? getQrAppSettings(site) : null;

	// Repli SSR / desktop / OS non reconnu : la page de téléchargement, puis n'importe quelle
	// URL store si aucun `fallbackNode` n'est contribué (mieux vaut une destination imparfaite
	// qu'un bouton sans href). L'arbitrage iOS / Android a lieu côté client dans le Menu
	// Island (`useMobileAppHref`).
	const downloadAppHref =
		qrAppSettings?.fallbackUrl || qrAppSettings?.iosUrl || qrAppSettings?.androidUrl;
	const ctaDownloadApp: CtaProps | undefined = downloadAppHref
		? {
				type: "button",
				variant: "accent",
				iconLeft: "download",
				label: downloadAppLabel,
				href: downloadAppHref,
				// `_blank` : la destination est un store externe (ou la page de repli), on ne
				// quitte pas le site sous le pied du visiteur. Aligné sur `MobileDownloadCta`,
				// qui ouvre les mêmes URLs dans un nouvel onglet. `Cta` pose le
				// `rel="noopener noreferrer"` qui va avec.
				target: "_blank",
				tracking: {
					event: "click_cta",
					banner_cta: downloadAppLabel,
					cta_section: "navmenu-downloadapp",
				},
			}
		: undefined;

	// CTA "crédit / prêt" : propriétés inline préfixées `loan*`,
	// indépendantes du CTA "télécharger l'app" (pas de jmix:link partagé).
	const loanLink = readPrefixedLink(currentNode, "loan");
	const ctaLoan: CtaProps | undefined = loanLink
		? {
				type: "button",
				variant: "accent",
				label: "Je simule mon crédit",
				href: loanLink.href,
				target: loanLink.target,
				tracking: {
					event: "click_cta",
					banner_cta: "Je simule mon crédit",
					cta_section: "navmenu-loan",
				},
			}
		: undefined;

	const mySpaceCtaBase = mySpaceNode ? getCtaProps(mySpaceNode, "navmenu-myspace-cta") : null;
	const mySpaceCta: CtaProps | undefined = mySpaceCtaBase
		? {
				...mySpaceCtaBase,
				variant: "accent",
				tracking: {
					event: "click_cta",
					banner_cta: mySpaceCtaBase.label,
					cta_section: "navmenu-myspace",
				},
			}
		: undefined;

	// TopBar (dark top tab bar) is now rendered inside the Menu Island instead of as a
	// standalone `tabMenu` view. Both tabs and the search field travel as serializable data:
	// the Menu Island renders <Search> from `searchProps` as part of its own hydrated tree,
	// so it survives the mobile/desktop branch switch (a nested island slot would not).
	const topBarProps: TopBarProps | undefined = tabMenuNode
		? { tabs: mapTopBarTabs(tabMenuNode) }
		: undefined;
	const searchNode = tabMenuNode ? getChildNode(tabMenuNode, "search") : null;
	const searchProps: SearchProps | undefined = searchNode ? mapSearchProps(searchNode) : undefined;

	const logoSrc = logo ? buildNodeUrl(logo) : "";
	const logoHref = str(currentNode, "logoUrl") || getHomePageUrl();
	const data: MenuProps = {
		logo: {
			src: logoSrc,
			alt: logo?.getDisplayableName() ?? "",
			label: logo?.getDisplayableName() ?? "",
			href: logoHref,
		},
		sections,
		linksPropsDesktop: desktopLinks,
		linksPropsMobile: mySpaceLinksMobile,
		ctaLogin: mySpaceCta,
		...(ctaDownloadApp ? { ctaDownloadApp } : {}),
		...(qrAppSettings?.iosUrl ? { downloadAppHrefIos: qrAppSettings.iosUrl } : {}),
		...(qrAppSettings?.androidUrl ? { downloadAppHrefAndroid: qrAppSettings.androidUrl } : {}),
		...(ctaLoan ? { ctaLoan } : {}),
		...(topBarProps ? { topBarProps } : {}),
		...(searchProps ? { searchProps } : {}),
	};

	return { data, smartPushConfig };
}
