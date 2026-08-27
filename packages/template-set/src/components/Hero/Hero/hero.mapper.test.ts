import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("#lib/cta", () => ({
	getCtaProps: vi.fn((_n: unknown, section: string) => ({ label: "CTA", ctaSection: section })),
}));
vi.mock("#lib/renderContext", () => ({ addCacheDependency: vi.fn() }));

import { mapHeroProps, mapHeroPropsServer } from "./hero.mapper";

const imageProps = {
	imageBeforeAnim: "before.jpg",
	imageDesktop: "d.jpg",
	imageTablet: "t.jpg",
	imageMobile: "m.jpg",
};

describe("hero base data + variant resolution", () => {
	it("defaults to v1 when the variant is unknown", () => {
		const result = mapHeroPropsServer(makeNode({ props: { "variant": "wat", "jcr:title": "T" } }));
		expect(result.variant).toBe("v1");
		expect(result.title).toBe("T");
	});

	it("includes promotion tracking only when a promotionId is set", () => {
		const withId = mapHeroPropsServer(
			makeNode({
				props: { variant: "v1", promotionId: "p1", promotionName: "PN", creativeName: "CN" },
			}),
		);
		expect(withId.tracking).toMatchObject({
			promotionId: "p1",
			promotionName: "PN",
			creativeName: "CN",
		});

		const withoutId = mapHeroPropsServer(makeNode({ props: { variant: "v1" } }));
		expect(withoutId.tracking).toBeUndefined();
	});
});

describe("V1", () => {
	it("server target has no arguments", () => {
		const result = mapHeroPropsServer(makeNode({ props: { variant: "v1", ...imageProps } }));
		expect(result).toMatchObject({ variant: "v1", img: { desktopSrc: "d.jpg" } });
		expect("args" in result).toBe(false);
	});

	it("client target collects up to 3 sofnt:heroArgument children (title capped at 36)", () => {
		const args = Array.from({ length: 5 }, (_, i) =>
			makeNode({
				id: `a${i}`,
				primaryType: "sofnt:heroArgument",
				props: { "jcr:title": `Argument ${i}` },
			}),
		);
		const node = makeNode({ props: { variant: "v1", ...imageProps }, children: args });
		const result = mapHeroProps(node) as { args: { id: string; label: string }[] };
		expect(result.args).toHaveLength(3);
		expect(result.args[0]).toEqual({ id: "a0", label: "Argument 0" });
	});

	it("client target ignores non-heroArgument children", () => {
		const node = makeNode({
			props: { variant: "v1", ...imageProps },
			children: [makeNode({ primaryType: "sofnt:other" })],
		});
		expect((mapHeroProps(node) as { args: unknown[] }).args).toEqual([]);
	});
});

describe("image sources — objet img + repli", () => {
	it("mappe les 4 breakpoints (lowSrc/desktop/tablet/mobile) quand tout est renseigne", () => {
		const result = mapHeroProps(makeNode({ props: { variant: "v1", ...imageProps } })) as {
			img: Record<string, string>;
		};
		expect(result.img).toEqual({
			lowSrc: "before.jpg",
			desktopSrc: "d.jpg",
			tabletSrc: "t.jpg",
			mobileSrc: "m.jpg",
		});
	});

	it("replie tablette & mobile sur le desktop quand elles ne sont pas fournies (jamais de <source> vide)", () => {
		const result = mapHeroProps(
			makeNode({
				props: { variant: "v1", imageBeforeAnim: "b.jpg", imageDesktop: "d.jpg" },
			}),
		) as { img: Record<string, string> };
		expect(result.img).toEqual({
			lowSrc: "b.jpg",
			desktopSrc: "d.jpg",
			tabletSrc: "d.jpg",
			mobileSrc: "d.jpg",
		});
	});

	it("replie le desktop sur la premiere source disponible (jamais de src vide)", () => {
		const result = mapHeroProps(makeNode({ props: { variant: "v1", imageMobile: "m.jpg" } })) as {
			img: Record<string, string>;
		};
		expect(result.img.desktopSrc).toBe("m.jpg");
		expect(result.img.tabletSrc).toBe("m.jpg");
	});

	it("prefere la tablette au mobile comme source de repli du desktop", () => {
		const result = mapHeroProps(
			makeNode({ props: { variant: "v1", imageTablet: "t.jpg", imageMobile: "m.jpg" } }),
		) as { img: Record<string, string> };
		expect(result.img.desktopSrc).toBe("t.jpg");
		expect(result.img.mobileSrc).toBe("m.jpg");
	});

	it("laisse toutes les sources vides quand aucune image n'est contribuee (les vues doivent ne rien rendre)", () => {
		const result = mapHeroProps(makeNode({ props: { variant: "v1" } })) as {
			img: Record<string, string>;
		};
		expect(result.img).toEqual({ lowSrc: "", desktopSrc: "", tabletSrc: "", mobileSrc: "" });
	});
});

describe("V2", () => {
	it("maps the offer fields and CTA identically on both targets", () => {
		const node = makeNode({
			props: {
				variant: "v2",
				...imageProps,
				offerRate: "0.9",
				offerRateLabel: "TAEG",
				offerRateLabelBis: "fixe",
				offerAmount: "10000",
				offerTitleBadge: "Badge",
				offerLabel: "Promo",
				mentionsLegales: "legal",
			},
		});
		const expected = {
			variant: "v2",
			img: { desktopSrc: "d.jpg" },
			offerRate: "0.9",
			offerRateLabel: "TAEG",
			offerAmount: "10000",
			offerTitleBadge: "Badge",
			offerBadge: "Promo",
			offerLegalText: "legal",
		};
		expect(mapHeroProps(node)).toMatchObject(expected);
		expect(mapHeroPropsServer(node)).toMatchObject(expected);
		expect((mapHeroProps(node) as { cta: unknown }).cta).toMatchObject({
			ctaSection: "hero-v2-cta",
		});
	});
});

describe("V3", () => {
	it("maps the hook fields and CTA", () => {
		const node = makeNode({
			props: { variant: "v3", ...imageProps, hookValue: "10", hookDateLabel: "jours" },
		});
		expect(mapHeroProps(node)).toMatchObject({
			variant: "v3",
			hookValue: "10",
			hookDateLabel: "jours",
		});
	});
});

describe("V4", () => {
	const videoProps = {
		variant: "v4",
		videoRef: "desktop.mp4",
		videoMobileRef: "mobile.mp4",
		videoPosterRef: "poster.jpg",
	};

	it("server target exposes flat video URLs", () => {
		const result = mapHeroPropsServer(makeNode({ props: videoProps })) as unknown as Record<
			string,
			unknown
		>;
		expect(result).toMatchObject({
			variant: "v4",
			videoUrl: "desktop.mp4",
			videoMobileUrl: "mobile.mp4",
			videoPosterUrl: "poster.jpg",
		});
	});

	it("client target nests a video object and a campaignCta", () => {
		const result = mapHeroProps(makeNode({ props: videoProps })) as unknown as Record<
			string,
			unknown
		>;
		expect(result.video).toEqual({
			srcDesktop: "desktop.mp4",
			srcMobile: "mobile.mp4",
			poster: "poster.jpg",
		});
		expect(result.campaignCta).toMatchObject({ ctaSection: "hero-v4-cta" });
	});

	it("client target leaves optional mobile/poster undefined when absent", () => {
		const result = mapHeroProps(
			makeNode({ props: { variant: "v4", videoRef: "d.mp4" } }),
		) as unknown as Record<string, unknown>;
		expect(result.video).toEqual({ srcDesktop: "d.mp4", srcMobile: undefined, poster: undefined });
	});
});
