import { describe, it, expect, vi } from "vitest";
import { makeNode, type PropValue } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import {
	buildSocialMetaTags,
	readOpenGraphOptions,
	toOgLocale,
	OPEN_GRAPH_TAGS_MIXIN,
	type SocialMetaInput,
	type SocialMetaTag,
} from "./openGraph";

/**
 * Un nœud image de test. `width`/`height` reproduisent `j:width`/`j:height` que
 * portent les nœuds `jmix:image`, `displayableName` le repli utilisé comme `alt`.
 */
const image = (
	url: string,
	{ width, height, name }: { width?: number; height?: number; name?: string } = {},
) =>
	makeNode({
		url,
		displayableName: name,
		props: {
			...(width === undefined ? {} : { "j:width": width }),
			...(height === undefined ? {} : { "j:height": height }),
		},
	});

const page = (props: Record<string, PropValue> = {}, withMixin = true) =>
	makeNode({
		nodeTypes: withMixin ? ["jnt:page", OPEN_GRAPH_TAGS_MIXIN] : ["jnt:page"],
		url: "/fr/credit-conso.html",
		props,
	});

/**
 * `buildSocialMetaTags` est pure : tout ce qui venait du `RenderContext` est
 * désormais résolu en amont (dans `Layout`) et passé ici — d'où l'absence totale
 * de stub de contexte dans ce fichier.
 */
const input = (over: Partial<SocialMetaInput> = {}): SocialMetaInput => ({
	title: "Titre",
	description: "",
	pageUrl: "https://www.sofinco.fr/credit-consommation",
	origin: "https://www.sofinco.fr",
	siteName: "Sofinco",
	locale: "fr_FR",
	...over,
});

/** Flattens the tag list into `key → content` for readable assertions. */
const byKey = (tags: SocialMetaTag[]) =>
	Object.fromEntries(tags.map((tag) => [tag.key, tag.content]));

describe("toOgLocale", () => {
	it("derives the territory from a language-only code", () => {
		expect(toOgLocale("fr")).toBe("fr_FR");
	});

	it("keeps an explicit territory and normalises the separator and case", () => {
		expect(toOgLocale("fr_BE")).toBe("fr_BE");
		expect(toOgLocale("fr-be")).toBe("fr_BE");
		expect(toOgLocale("FR")).toBe("fr_FR");
	});

	it("returns '' for an empty or blank code", () => {
		expect(toOgLocale("")).toBe("");
		expect(toOgLocale("   ")).toBe("");
	});
});

describe("readOpenGraphOptions", () => {
	it("reads the flags and resolves the image references with their dimensions", () => {
		expect(
			readOpenGraphOptions(
				page({
					activeFacebook: true,
					urlImgFacebook: image("/files/fb.jpg", {
						width: 1200,
						height: 630,
						name: "Carte Sofinco",
					}),
					activeTwitter: false,
					activeGoogle: true,
					urlImgGoogle: image("/files/g.jpg"),
				}),
			),
		).toEqual({
			activeFacebook: true,
			imgFacebook: { url: "/files/fb.jpg", width: 1200, height: 630, alt: "Carte Sofinco" },
			activeTwitter: false,
			imgTwitter: null,
			activeGoogle: true,
			// Fichier sans `j:width`/`j:height` ni nom affichable : les satellites
			// tombent à 0 / "" et seront écartés à l'émission.
			imgGoogle: { url: "/files/g.jpg", width: 0, height: 0, alt: "" },
		});
	});

	it("returns null when the page does not carry the mixin", () => {
		expect(readOpenGraphOptions(page({ activeFacebook: true }, false))).toBeNull();
	});

	it("returns null when the page node is unresolvable", () => {
		expect(readOpenGraphOptions(null)).toBeNull();
	});

	it("returns null when the node type lookup throws (mixin absent du runtime)", () => {
		// Le mock `#lib/jcr` implémente `hasMixin` en lisant le bag `__nodeTypes` :
		// patcher `isNodeType` ne suffirait pas à atteindre le `catch`, il faut
		// piéger l'accès aux propriétés du nœud.
		const broken = new Proxy(makeNode(), {
			get() {
				throw new Error("unknown node type");
			},
		});
		expect(readOpenGraphOptions(broken)).toBeNull();
	});
});

describe("buildSocialMetaTags", () => {
	it("emits the Open Graph set with an absolute URL, the image and its dimensions", () => {
		const tags = buildSocialMetaTags(
			page({
				activeFacebook: true,
				urlImgFacebook: image("/files/fb.jpg", {
					width: 1200,
					height: 630,
					name: "Carte Sofinco",
				}),
			}),
			input({ title: "Crédit conso | Sofinco", description: "Financez votre projet" }),
		);

		expect(byKey(tags)).toEqual({
			"og:type": "website",
			"og:title": "Crédit conso | Sofinco",
			"og:url": "https://www.sofinco.fr/credit-consommation",
			"og:description": "Financez votre projet",
			"og:site_name": "Sofinco",
			"og:locale": "fr_FR",
			"og:image": "https://www.sofinco.fr/files/fb.jpg",
			"og:image:width": "1200",
			"og:image:height": "630",
			"og:image:alt": "Carte Sofinco",
		});
		expect(tags.every((tag) => tag.property?.startsWith("og:"))).toBe(true);
	});

	it("emits og:image alone when the file carries neither dimensions nor a name", () => {
		const tags = buildSocialMetaTags(
			page({ activeFacebook: true, urlImgFacebook: image("/files/fb.jpg") }),
			input(),
		);
		expect(byKey(tags)["og:image"]).toBe("https://www.sofinco.fr/files/fb.jpg");
		expect(byKey(tags)["og:image:width"]).toBeUndefined();
		expect(byKey(tags)["og:image:height"]).toBeUndefined();
		expect(byKey(tags)["og:image:alt"]).toBeUndefined();
	});

	it("omits og:image and og:description when they are not set", () => {
		const tags = buildSocialMetaTags(page({ activeFacebook: true }), input());
		expect(Object.keys(byKey(tags))).toEqual([
			"og:type",
			"og:title",
			"og:url",
			"og:site_name",
			"og:locale",
		]);
	});

	it("emits the Twitter set, including the account attribution and the page URL", () => {
		const tags = buildSocialMetaTags(
			page({
				activeTwitter: true,
				// Les dimensions ne sont pas reprises côté Twitter Cards : seul `alt` existe.
				urlImgTwitter: image("/files/tw.jpg", { width: 1200, height: 630, name: "Carte X" }),
			}),
			input({ description: "Desc" }),
		);
		expect(byKey(tags)).toEqual({
			"twitter:card": "summary_large_image",
			"twitter:site": "@credit_sofinco",
			"twitter:creator": "@credit_sofinco",
			"twitter:title": "Titre",
			"twitter:description": "Desc",
			"twitter:url": "https://www.sofinco.fr/credit-consommation",
			"twitter:image": "https://www.sofinco.fr/files/tw.jpg",
			"twitter:image:alt": "Carte X",
		});
		expect(tags.every((tag) => tag.name?.startsWith("twitter:"))).toBe(true);
	});

	it("falls back to the summary card when Twitter has no image", () => {
		const tags = buildSocialMetaTags(page({ activeTwitter: true }), input());
		expect(byKey(tags)["twitter:card"]).toBe("summary");
		expect(byKey(tags)["twitter:image"]).toBeUndefined();
		expect(byKey(tags)["twitter:image:alt"]).toBeUndefined();
	});

	it("emits schema.org itemprop tags for Google", () => {
		const tags = buildSocialMetaTags(
			page({ activeGoogle: true, urlImgGoogle: image("/files/g.jpg") }),
			input({ description: "Desc" }),
		);
		expect(tags).toEqual([
			{ key: "itemprop:name", itemProp: "name", content: "Titre" },
			{ key: "itemprop:description", itemProp: "description", content: "Desc" },
			{
				key: "itemprop:image",
				itemProp: "image",
				content: "https://www.sofinco.fr/files/g.jpg",
			},
			{ key: "itemprop:inLanguage", itemProp: "inLanguage", content: "fr_FR" },
		]);
	});

	it("combines every activated network", () => {
		const tags = buildSocialMetaTags(
			page({
				activeFacebook: true,
				urlImgFacebook: image("/files/fb.jpg"),
				activeTwitter: true,
				urlImgTwitter: image("/files/tw.jpg"),
				activeGoogle: true,
				urlImgGoogle: image("/files/g.jpg"),
			}),
			input(),
		);
		expect(byKey(tags)["og:image"]).toBe("https://www.sofinco.fr/files/fb.jpg");
		expect(byKey(tags)["twitter:image"]).toBe("https://www.sofinco.fr/files/tw.jpg");
		expect(byKey(tags)["itemprop:image"]).toBe("https://www.sofinco.fr/files/g.jpg");
	});

	it("returns an empty list when no network is activated", () => {
		expect(buildSocialMetaTags(page({ urlImgFacebook: image("/a.jpg") }), input())).toEqual([]);
	});

	it("returns an empty list when the page does not carry the mixin", () => {
		expect(buildSocialMetaTags(page({ activeFacebook: true }, false), input())).toEqual([]);
	});

	it("returns an empty list when the page node is unresolvable", () => {
		expect(buildSocialMetaTags(null, input())).toEqual([]);
	});

	it("keeps relative image URLs and drops the tags whose input is empty", () => {
		expect(
			byKey(
				buildSocialMetaTags(
					page({ activeFacebook: true, urlImgFacebook: image("/files/fb.jpg") }),
					input({ origin: "", pageUrl: "/fr/credit-conso.html", siteName: "" }),
				),
			),
		).toEqual({
			"og:type": "website",
			"og:title": "Titre",
			"og:url": "/fr/credit-conso.html",
			"og:locale": "fr_FR",
			"og:image": "/files/fb.jpg",
		});
	});

	it("omits og:locale when the resource locale is unknown", () => {
		const tags = buildSocialMetaTags(page({ activeFacebook: true }), input({ locale: "" }));
		expect(byKey(tags)["og:locale"]).toBeUndefined();
	});
});
