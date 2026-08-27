import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";
import type { JCRNodeWrapper } from "org.jahia.services.content";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("@jahia/javascript-modules-library", () => ({
	buildNodeUrl: vi.fn((node: { getUrl(): string }) => node.getUrl()),
}));
// The logo click href falls back to the site home page when no `logoUrl` is configured.
vi.mock("#lib/renderContext", () => ({
	getHomePageUrl: vi.fn(() => "/accueil"),
}));

// Sibling mappers are mocked so this test stays scoped to the navMenu mapping itself.
vi.mock("../TabMenu/tabMenu.mapping", () => ({
	mapTopBarTabs: vi.fn(() => [{ href: "/p", label: "Particuliers" }]),
}));
vi.mock("../../Search/search.mapping", () => ({
	mapSearchProps: vi.fn(() => ({ action: "/search", placeholder: "Rechercher" })),
}));
// Config de site `sofnt:qrAppSettings` : mockée pour piloter la présence des URLs stores.
const getQrAppSettings = vi.fn<
	(site: unknown) => { iosUrl?: string; androidUrl?: string; fallbackUrl?: string } | null
>(() => null);
// L'indirection par flèche est imposée par le hoisting de `vi.mock` ; on relaie l'argument
// pour pouvoir vérifier que le mapper lit bien la config du SITE (et non de `currentNode`).
vi.mock("#lib/siteConfigs", () => ({
	getQrAppSettings: (site: unknown) => getQrAppSettings(site),
}));
vi.mock("#cms/Faq/SmartPush/smartPush.mapping", () => ({
	mapSmartPushConfig: vi.fn((site: unknown) => (site ? { jsUrl: "/push.js", kbId: "42" } : null)),
	buildSmartPushLink: vi.fn(() => ({
		id: "smartpush-trigger",
		href: "#",
		label: "Aide & Contact",
	})),
}));

import { mapNavMenuProps } from "./navMenu.mapping";

/** A logo fake node — `makeNode` doesn't implement `getDisplayableName`, so we graft it on. */
const makeLogo = (url: string, name: string): JCRNodeWrapper =>
	Object.assign(makeNode({ url }), { getDisplayableName: () => name }) as JCRNodeWrapper;

/** A resolvable internal `sofnt:link` child of the mySpace node. */
const linkChild = (title: string, url: string) =>
	makeNode({
		nodeTypes: ["sofnt:link"],
		props: {
			"j:linkType": "internal",
			"j:linknode": makeNode({ url }),
			"jcr:title": title,
			"j:target": "_self",
		},
	});

describe("mapNavMenuProps", () => {
	it("maps a minimal navMenu (no children, no logo, no site)", () => {
		const node = makeNode({ primaryType: "sofnt:navMenu" });
		const { data, smartPushConfig } = mapNavMenuProps(node, null, null);

		expect(smartPushConfig).toBeNull();
		expect(data).toEqual({
			logo: { src: "", alt: "", label: "", href: "/accueil" },
			sections: [],
			linksPropsDesktop: [],
			linksPropsMobile: [],
			ctaLogin: undefined,
		});
	});

	it("derives the logo block from the logo node", () => {
		const node = makeNode({ primaryType: "sofnt:navMenu" });
		const logo = makeLogo("/logo.svg", "Sofinco");

		const { data } = mapNavMenuProps(node, logo, null);
		expect(data.logo).toEqual({
			src: "/logo.svg",
			alt: "Sofinco",
			label: "Sofinco",
			href: "/accueil",
		});
	});

	it("uses the configured logoUrl as the logo click href when set", () => {
		const node = makeNode({
			primaryType: "sofnt:navMenu",
			props: { logoUrl: "/mon-lien" },
		});
		const logo = makeLogo("/logo.svg", "Sofinco");

		const { data } = mapNavMenuProps(node, logo, null);
		expect(data.logo).toEqual({
			src: "/logo.svg",
			alt: "Sofinco",
			label: "Sofinco",
			href: "/mon-lien",
		});
	});

	it("maps nav sections, subsections, links and the side card", () => {
		const navLink = makeNode({
			id: "nl-1",
			nodeTypes: ["sofnt:navLink"],
			props: { "jcr:title": "Crédits" },
			children: [
				makeNode({
					nodeTypes: ["sofnt:menuNodeLink"],
					props: { "jcr:title": "Crédit auto", "j:linknode": makeNode({ url: "/auto" }) },
				}),
				// No linknode → href falls back to "#".
				makeNode({
					nodeTypes: ["sofnt:menuNodeLink"],
					props: { "jcr:title": "Sans lien" },
				}),
			],
		});
		const navSection = makeNode({
			id: "sec-1",
			nodeTypes: ["sofnt:navSection"],
			props: {
				"jcr:title": "Particuliers",
				"sideImg": makeNode({ url: "/side.jpg" }),
				"sidePage": makeNode({ url: "/page" }),
				"sideTitle": "Notre offre",
				"titleCta": "Découvrir",
			},
			children: [navLink],
		});
		const node = makeNode({
			primaryType: "sofnt:navMenu",
			children: [navSection],
		});

		const { data } = mapNavMenuProps(node, null, null);
		expect(data.sections).toEqual([
			{
				id: "sec-1",
				title: "Particuliers",
				subsections: [
					{
						id: "nl-1",
						title: "Crédits",
						links: [
							{
								href: "/auto",
								label: "Crédit auto",
								tracking: {
									event: "click_menu",
									menu_level_1: "Particuliers",
									menu_level_2: "Crédits",
									menu_level_3: "Crédit auto",
								},
							},
							{
								href: "#",
								label: "Sans lien",
								tracking: {
									event: "click_menu",
									menu_level_1: "Particuliers",
									menu_level_2: "Crédits",
									menu_level_3: "Sans lien",
								},
							},
						],
					},
				],
				card: {
					title: "Notre offre",
					image: "/side.jpg",
					cta: {
						type: "button",
						variant: "accent",
						label: "Découvrir",
						href: "/page",
						tracking: {
							event: "click_menu",
							menu_level_1: "Particuliers",
							menu_level_2: "",
							menu_level_3: "",
							banner_cta: "Découvrir",
						},
						ctaSection: "navmenu-section-card-cta",
					},
				},
			},
		]);
	});

	it("omits the card when there is no side image, and the card CTA when there is no side page", () => {
		const sectionNoImg = makeNode({
			id: "a",
			nodeTypes: ["sofnt:navSection"],
			props: { "jcr:title": "A" },
		});
		const sectionImgNoPage = makeNode({
			id: "b",
			nodeTypes: ["sofnt:navSection"],
			props: { "jcr:title": "B", "sideImg": makeNode({ url: "/img.jpg" }), "sideTitle": "T" },
		});
		const node = makeNode({
			primaryType: "sofnt:navMenu",
			children: [sectionNoImg, sectionImgNoPage],
		});

		const { data } = mapNavMenuProps(node, null, null);
		expect(data.sections[0].card).toBeUndefined();
		// titleCta falls back to "En savoir plus"; no sidePage → cta undefined.
		expect(data.sections[1].card).toEqual({
			title: "T",
			image: "/img.jpg",
			cta: undefined,
		});
	});

	it("maps mySpace links into desktop/mobile link lists and the login CTA", () => {
		const mySpace = makeNode({
			nodeTypes: ["sofnt:mySpace"],
			props: {
				// External CTA so getCtaProps resolves a login CTA.
				ctaType: "external",
				ctaExternalUrl: "https://espace.example",
				ctaLabel: "Mon espace",
			},
			children: [linkChild("Messagerie", "/messagerie")],
		});
		const node = makeNode({
			primaryType: "sofnt:navMenu",
			named: { mySpace },
		});

		const { data } = mapNavMenuProps(node, null, null);
		expect(data.linksPropsDesktop).toEqual([
			{
				href: "/messagerie",
				label: "Messagerie",
				isExternal: false,
				iconLeft: undefined,
				iconRight: undefined,
				iconVariant: "primary",
				tracking: { event: "click_menu_myspace", menu_level_1: "Messagerie" },
			},
		]);
		expect(data.linksPropsMobile).toEqual(data.linksPropsDesktop);
		expect(data.ctaLogin).toEqual({
			label: "Mon espace",
			href: "https://espace.example",
			target: "_self",
			ctaSection: "navmenu-myspace-cta",
			variant: "accent",
			tracking: {
				event: "click_cta",
				banner_cta: "Mon espace",
				cta_section: "navmenu-myspace",
			},
		});
	});

	it("lifts tabMenu mobile-flagged links into the mobile list only", () => {
		const tabMenu = makeNode({
			nodeTypes: ["sofnt:tabMenu"],
			children: [
				makeNode({
					nodeTypes: ["sofnt:menuLink"],
					props: {
						"mobile": true,
						"j:linkType": "internal",
						"j:linknode": makeNode({ url: "/pro" }),
						"jcr:title": "Pros",
						"j:target": "_self",
					},
				}),
				// Not flagged mobile → excluded.
				makeNode({
					nodeTypes: ["sofnt:menuLink"],
					props: {
						"j:linkType": "internal",
						"j:linknode": makeNode({ url: "/x" }),
						"jcr:title": "Desktop only",
						"j:target": "_self",
					},
				}),
			],
		});
		const node = makeNode({ primaryType: "sofnt:navMenu", named: { tabMenu } });

		const { data } = mapNavMenuProps(node, null, null);
		expect(data.linksPropsDesktop).toEqual([]);
		expect(data.linksPropsMobile?.map((l) => l.label)).toEqual(["Pros"]);
	});

	it("appends the Smart Push trigger link to both lists when enabled", () => {
		const mySpace = makeNode({
			nodeTypes: ["sofnt:mySpace"],
			props: { showSmartPush: true },
			children: [linkChild("Messagerie", "/messagerie")],
		});
		const node = makeNode({ primaryType: "sofnt:navMenu", named: { mySpace } });
		const site = makeNode({ primaryType: "jnt:virtualsite" });

		const { data, smartPushConfig } = mapNavMenuProps(node, null, site);
		expect(smartPushConfig).toEqual({ jsUrl: "/push.js", kbId: "42" });
		expect(data.linksPropsDesktop?.map((l) => l.label)).toEqual(["Messagerie", "Aide & Contact"]);
		expect(data.linksPropsMobile?.map((l) => l.label)).toEqual(["Messagerie", "Aide & Contact"]);
	});

	it("does not enable Smart Push when the site config resolves to null", () => {
		const mySpace = makeNode({
			nodeTypes: ["sofnt:mySpace"],
			props: { showSmartPush: true },
		});
		const node = makeNode({ primaryType: "sofnt:navMenu", named: { mySpace } });

		// site === null → mocked mapSmartPushConfig returns null.
		const { data, smartPushConfig } = mapNavMenuProps(node, null, null);
		expect(smartPushConfig).toBeNull();
		expect(data.linksPropsDesktop).toEqual([]);
	});

	it("maps the downloadApp CTA from the site config, and the loan inline CTA", () => {
		// Le navMenu ne contribue QUE le libellé : href, stores et repli viennent du site.
		getQrAppSettings.mockReturnValueOnce({
			iosUrl: "https://apps.apple.com/app",
			androidUrl: "https://play.google.com/store/apps",
			fallbackUrl: "/telecharger-l-application",
		});
		const node = makeNode({
			primaryType: "sofnt:navMenu",
			props: {
				downloadAppLabel: "Télécharger l'app",
				loanLinkType: "external",
				loanExternalUrl: "https://credit.example",
				loanLabel: "Crédit",
			},
		});
		const site = makeNode({ primaryType: "jnt:virtualsite" });

		const { data } = mapNavMenuProps(node, null, site);
		// La config est lue sur le SITE, pas sur le nœud courant.
		expect(getQrAppSettings).toHaveBeenCalledWith(site);
		expect(data.ctaDownloadApp).toEqual({
			type: "button",
			variant: "accent",
			iconLeft: "download",
			label: "Télécharger l'app",
			href: "/telecharger-l-application",
			// Destination externe (store) : nouvel onglet, aligné sur MobileDownloadCta.
			target: "_blank",
			tracking: {
				event: "click_cta",
				banner_cta: "Télécharger l'app",
				cta_section: "navmenu-downloadapp",
			},
		});
		// La page de repli est le href SSR / desktop ; l'OS est arbitré côté client.
		expect(data.downloadAppHrefIos).toBe("https://apps.apple.com/app");
		expect(data.downloadAppHrefAndroid).toBe("https://play.google.com/store/apps");

		expect(data.ctaLoan).toEqual({
			type: "button",
			variant: "accent",
			label: "Je simule mon crédit",
			href: "https://credit.example",
			target: "_self",
			tracking: {
				event: "click_cta",
				banner_cta: "Je simule mon crédit",
				cta_section: "navmenu-loan",
			},
		});
	});

	it("falls back to a store URL as the CTA href when no fallbackNode is contributed", () => {
		getQrAppSettings.mockReturnValueOnce({ iosUrl: "https://apps.apple.com/app" });
		const node = makeNode({
			primaryType: "sofnt:navMenu",
			props: { downloadAppLabel: "Télécharger l'app" },
		});

		const { data } = mapNavMenuProps(node, null, makeNode({ primaryType: "jnt:virtualsite" }));
		// Mieux vaut une destination imparfaite qu'un bouton sans href.
		expect(data.ctaDownloadApp?.href).toBe("https://apps.apple.com/app");
		expect(data.downloadAppHrefAndroid).toBeUndefined();
	});

	it("omits the CTA without a label, without a site, or when the app is globally disabled", () => {
		const site = makeNode({ primaryType: "jnt:virtualsite" });

		// Libellé vide → pas de bouton, et on ne lit même pas la config de site.
		getQrAppSettings.mockClear();
		const { data: noLabel } = mapNavMenuProps(
			makeNode({ primaryType: "sofnt:navMenu" }),
			null,
			site,
		);
		expect(getQrAppSettings).not.toHaveBeenCalled();
		expect(noLabel.ctaDownloadApp).toBeUndefined();
		expect(noLabel.downloadAppHrefIos).toBeUndefined();

		// Libellé contribué mais config absente ou `isGlobalAppActive = false`
		// (mock par défaut → null) : plus aucune destination, donc pas de bouton.
		const labelled = makeNode({
			primaryType: "sofnt:navMenu",
			props: { downloadAppLabel: "Télécharger l'app" },
		});
		const { data: killSwitch } = mapNavMenuProps(labelled, null, site);
		expect(killSwitch.ctaDownloadApp).toBeUndefined();
		expect(killSwitch.downloadAppHrefIos).toBeUndefined();

		// Pas de site (rendu hors contexte) → pas de bouton non plus.
		const { data: noSite } = mapNavMenuProps(labelled, null, null);
		expect(noSite.ctaDownloadApp).toBeUndefined();
	});

	it("includes topBarProps and searchProps when a tabMenu with a search child is present", () => {
		const tabMenu = makeNode({
			nodeTypes: ["sofnt:tabMenu"],
			named: { search: makeNode({ nodeTypes: ["sofnt:search"] }) },
		});
		const node = makeNode({ primaryType: "sofnt:navMenu", named: { tabMenu } });

		const { data } = mapNavMenuProps(node, null, null);
		expect(data.topBarProps).toEqual({ tabs: [{ href: "/p", label: "Particuliers" }] });
		expect(data.searchProps).toEqual({ action: "/search", placeholder: "Rechercher" });
	});

	it("omits topBarProps/searchProps when there is no tabMenu, and searchProps when no search child", () => {
		const noTab = mapNavMenuProps(makeNode({ primaryType: "sofnt:navMenu" }), null, null).data;
		expect(noTab.topBarProps).toBeUndefined();
		expect(noTab.searchProps).toBeUndefined();

		const tabMenu = makeNode({ nodeTypes: ["sofnt:tabMenu"] });
		const node = makeNode({ primaryType: "sofnt:navMenu", named: { tabMenu } });
		const withTab = mapNavMenuProps(node, null, null).data;
		expect(withTab.topBarProps).toEqual({ tabs: [{ href: "/p", label: "Particuliers" }] });
		expect(withTab.searchProps).toBeUndefined();
	});
});
