import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("#lib/renderContext", () => ({ getHomePageUrl: vi.fn(() => "/home") }));
vi.mock("#cms/QrSticker/qr.mapper", () => ({
	mapQrStickerProps: vi.fn(() => ({ src: "qr.png", isActive: true })),
}));
vi.mock("#cms/AvisClientsSticker/avisClientsSticker.mapping", () => ({
	mapAvisClientsStickerPropsClient: vi.fn(() => ({ avisTitle: "Avis" })),
}));
// Each sub-mapper is stubbed to echo its child node's `id` (the per-child marker), so the
// test verifies that the footer wires every wrapped list to the right sub-mapper, in order.
vi.mock("../FooterPartnerLogo/footerPartnerLogo.mapping", () => ({
	mapFooterPartnerLogoPropsClient: vi.fn((n: { getIdentifier(): string }) => ({
		id: n.getIdentifier(),
		imageUrl: "",
	})),
}));
vi.mock("../FooterCategory/footerCategory.mapping", () => ({
	mapFooterCategoryPropsClient: vi.fn((n: { getIdentifier(): string }) => ({
		id: n.getIdentifier(),
		links: [],
	})),
}));
vi.mock("../FooterSocialLink/footerSocialLink.mapping", () => ({
	mapFooterSocialLinkPropsClient: vi.fn((n: { getIdentifier(): string }) => ({
		id: n.getIdentifier(),
		network: "facebook",
	})),
}));
vi.mock("../FooterLink/footerLink.mapping", () => ({
	mapFooterLinkPropsClient: vi.fn((n: { getIdentifier(): string }) => ({
		id: n.getIdentifier(),
		href: "/x",
	})),
}));
// `resolveCtaMode` lit les mixins/propriétés réels du nœud : le double `makeNode` les
// porte, on garde donc le vrai helper plutôt qu'un mock qui masquerait le contrat.

const t = (k: string) => `t:${k}`;
import { mapFooterPropsClient, mapFooterPropsServer } from "./footer.mapping";

describe("mapFooterPropsServer", () => {
	it("maps logo, texts and translated section titles", () => {
		const node = makeNode({
			props: {
				mainLogo: "logo.svg",
				bottomSubtitle: "bottom",
				legalMention: "legal",
				socialTitle: "Suivez",
			},
		});
		expect(mapFooterPropsServer(node, t)).toEqual({
			mainLogoUrl: "logo.svg",
			bottomSubtitle: "bottom",
			legalMention: "legal",
			socialTitle: "Suivez",
			partnersTitle: "t:footer.partnersTitle",
			categoryLinkTitle: "t:footer.categoryLinkTitle",
			moreInfosTitle: "t:footer.moreInfosTitle",
		});
	});
});

describe("mapFooterPropsClient", () => {
	const wrapper = (wrapperType: string, itemType: string, ids: string[]) =>
		makeNode({
			nodeTypes: [wrapperType],
			children: ids.map((id) => makeNode({ id, nodeTypes: [itemType] })),
		});

	it("falls back to translations / home URL and maps every wrapped list + stickers", () => {
		const node = makeNode({
			props: {},
			children: [
				wrapper("sofnt:partnerList", "sofnt:partner", ["p1"]),
				wrapper("sofnt:categoryLinkList", "sofnt:categoryLink", ["c1", "c2"]),
				wrapper("sofnt:socialLinkList", "sofnt:socialLink", ["s1"]),
				wrapper("sofnt:linkList", "sofnt:footerLink", ["l1"]),
			],
			named: { qrCode: makeNode({ id: "qr" }), avisClients: makeNode({ id: "avis" }) },
		});

		const result = mapFooterPropsClient(node, t);
		expect(result.mainLogoLinkUrl).toBe("/home");
		expect(result.socialTitle).toBe("t:footer.followUs");
		expect(result.mainLogoAlt).toBe("t:footer.mainLogoAlt");
		expect(result.partners).toEqual([{ id: "p1", imageUrl: "" }]);
		expect(result.categories).toEqual([
			{ id: "c1", links: [] },
			{ id: "c2", links: [] },
		]);
		expect(result.socialLinks).toEqual([{ id: "s1", network: "facebook" }]);
		expect(result.legalLinks).toEqual([{ id: "l1", href: "/x" }]);
		expect(result.qrCode).toEqual({ src: "qr.png", isActive: true });
		expect(result.avisClientData).toEqual({ avisTitle: "Avis" });
	});

	it("garde l'entrée de consentement dans la liste unique, à sa place contribuée", () => {
		/*
		 * UNE liste, pas deux : c'est ce qui préserve la position choisie par le
		 * contributeur. L'entrée de consentement porte ici son mixin pour prouver
		 * qu'elle n'est NI filtrée NI déplacée — une régression vers un partitionnement
		 * la ferait sortir de cette position et échouerait ici.
		 *
		 * Sa résolution (l'ancre `#gerer-mes-cookies`) appartient à `#lib/cta` et est
		 * couverte par `src/lib/cta.test.ts` ; le mapper de lien est doublé ici.
		 */
		const legalList = makeNode({
			nodeTypes: ["sofnt:linkList"],
			children: [
				makeNode({ id: "l2", nodeTypes: ["sofnt:footerLink"] }),
				makeNode({ id: "consent", nodeTypes: ["sofnt:footerLink", "sofmix:ctaConsent"] }),
				makeNode({ id: "l1", nodeTypes: ["sofnt:footerLink"] }),
			],
		});

		const result = mapFooterPropsClient(makeNode({ children: [legalList] }), t);

		expect(result.legalLinks).toEqual([
			{ id: "l2", href: "/x" },
			{ id: "consent", href: "/x" },
			{ id: "l1", href: "/x" },
		]);
	});

	it("leaves qrCode / avisClientData undefined when the child nodes are absent", () => {
		const result = mapFooterPropsClient(makeNode(), t);
		expect(result.qrCode).toBeUndefined();
		expect(result.avisClientData).toBeUndefined();
		expect(result.partners).toEqual([]);
	});
});
