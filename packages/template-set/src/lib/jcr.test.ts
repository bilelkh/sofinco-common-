import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeNode } from "#test/jahia";
import type { RenderContext } from "org.jahia.services.render";
import type { JCRNodeWrapper } from "org.jahia.services.content";

vi.mock("@jahia/javascript-modules-library", () => ({
	buildNodeUrl: vi.fn((node: { getUrl(): string }) => node.getUrl()),
	useServerContext: vi.fn(() => ({ renderContext: { getSite: () => undefined } })),
}));
vi.mock("./i18n", () => ({ useAppTranslation: () => ({ t: (k: string) => `t:${k}` }) }));
// `superscriptFootnoteTokens` est appliqué à TOUTE lecture par `str` : le stub le rend
// visible dans les assertions, ce qui vérifie au passage qu'il est bien branché partout.
vi.mock("./footnotes", () => ({
	manageFooterNote: (v: string) => `[note]${v}`,
	superscriptFootnoteTokens: (v: string) => v.replace(/\(\((\d+)\)\)/g, "[sup]$1"),
}));
vi.mock("./footnoteFields", () => ({ shouldProcessFootnotes: vi.fn(() => false) }));
// `./cacheDependency` n'est volontairement PAS mocké : on veut vérifier les regex
// réellement produits (échappement compris). Seule sa dépendance `./renderContext`
// est mockée, ce qui fait de ces cas des tests d'intégration jcr → cacheDependency.
// `getRequestAttribute` est la porte d'entrée de `insuranceVars` vers le filtre Java : elle
// doit figurer ici, sinon la substitution branchée dans `str` lèverait.
vi.mock("./renderContext", () => ({
	addCacheDependency: vi.fn(),
	isEditMode: vi.fn(() => false),
	getRequestAttribute: vi.fn(),
}));

import { buildNodeUrl, useServerContext } from "@jahia/javascript-modules-library";
import { shouldProcessFootnotes } from "./footnoteFields";
import { addCacheDependency, isEditMode, getRequestAttribute } from "./renderContext";
// Registre réel : ces cas vérifient que `str` est bien LE point de branchement de la
// substitution des variables de simulation. Sans eux, retirer cet appel ne casserait rien.
import {
	startInsuranceVars,
	stopInsuranceVars,
	readUnresolvedInsuranceVars,
} from "./insuranceVars";
import {
	str,
	strList,
	strLimit,
	imgUrl,
	imgMeta,
	vidUrl,
	nodeUrl,
	getChildNode,
	getPropertyAsNode,
	num,
	getDouble,
	getChildNodesByType,
	getAsBoolean,
	hasMixin,
	getGlobalSettingsNode,
	findAncestor,
	getAncestorUrl,
	getCurrentPageNode,
	getDate,
	findChildByType,
	getWrapperItems,
	DEFAULT_DATE_FORMATTER,
} from "./jcr";

beforeEach(() => {
	vi.mocked(isEditMode).mockReturnValue(false);
	vi.mocked(shouldProcessFootnotes).mockReturnValue(false);
	vi.mocked(useServerContext).mockReturnValue({
		renderContext: { getSite: () => undefined },
	} as unknown as ReturnType<typeof useServerContext>);
});

describe("str", () => {
	it("returns the property string", () => {
		expect(str(makeNode({ props: { title: "Hello" } }), "title")).toBe("Hello");
	});
	it("returns the fallback when the property is absent", () => {
		expect(str(makeNode(), "title", "def")).toBe("def");
		expect(str(makeNode(), "title")).toBe("");
	});
	it("runs footnote processing when the field is registered", () => {
		vi.mocked(shouldProcessFootnotes).mockReturnValue(true);
		expect(str(makeNode({ props: { legalMention: "x" } }), "legalMention")).toBe("[note]x");
	});
	it("skips footnote processing when the value is empty", () => {
		vi.mocked(shouldProcessFootnotes).mockReturnValue(true);
		expect(str(makeNode({ props: { legalMention: "" } }), "legalMention")).toBe("");
	});
});

describe("strList", () => {
	it("returns multi-valued strings", () => {
		expect(strList(makeNode({ props: { tags: ["a", "b"] } }), "tags")).toEqual(["a", "b"]);
	});
	it("returns [] when absent", () => {
		expect(strList(makeNode(), "tags")).toEqual([]);
	});
	it("returns [] when getValues throws (defensive catch)", () => {
		const throwing = {
			hasProperty: () => true,
			getProperty: () => ({
				getValues: () => {
					throw new Error("boom");
				},
			}),
		} as unknown as JCRNodeWrapper;
		expect(strList(throwing, "tags")).toEqual([]);
	});
});

describe("strLimit", () => {
	it("truncates to the limit", () => {
		expect(strLimit(makeNode({ props: { t: "abcdef" } }), "t", 3)).toBe("abc");
	});
	it("returns the fallback when absent", () => {
		expect(strLimit(makeNode(), "t", 3, "-")).toBe("-");
	});
});

describe("imgUrl / vidUrl / nodeUrl", () => {
	it("imgUrl builds the URL of the referenced node", () => {
		const ref = makeNode({ url: "/img.png" });
		expect(imgUrl(makeNode({ props: { p: ref } }), "p")).toBe("/img.png");
	});
	it("imgUrl returns empty when the ref is missing or invalid", () => {
		expect(imgUrl(makeNode(), "p")).toBe("");
		expect(imgUrl(makeNode({ props: { p: "not-a-node" } }), "p")).toBe("");
	});
	it("vidUrl mirrors imgUrl", () => {
		const ref = makeNode({ url: "/v.mp4" });
		expect(vidUrl(makeNode({ props: { p: ref } }), "p")).toBe("/v.mp4");
	});
	it("nodeUrl(propertyName) reads the ref, nodeUrl() reads the node itself", () => {
		const ref = makeNode({ url: "/t" });
		expect(nodeUrl(makeNode({ props: { p: ref } }), "p")).toBe("/t");
		expect(nodeUrl(makeNode({ url: "/self" }))).toBe("/self");
	});
});

describe("imgMeta", () => {
	it("returns the URL, the jmix:image dimensions and the displayable name", () => {
		const ref = makeNode({
			url: "/img.png",
			displayableName: "Visuel de partage",
			props: { "j:width": 1200, "j:height": 630 },
		});
		expect(imgMeta(makeNode({ props: { p: ref } }), "p")).toEqual({
			url: "/img.png",
			width: 1200,
			height: 630,
			alt: "Visuel de partage",
		});
	});

	it("falls back to 0 / '' when the file carries no dimension nor name", () => {
		const ref = makeNode({ url: "/img.png" });
		expect(imgMeta(makeNode({ props: { p: ref } }), "p")).toEqual({
			url: "/img.png",
			width: 0,
			height: 0,
			alt: "",
		});
	});

	it("returns null when the ref is missing or invalid", () => {
		expect(imgMeta(makeNode(), "p")).toBeNull();
		expect(imgMeta(makeNode({ props: { p: "not-a-node" } }), "p")).toBeNull();
	});
});

describe("getChildNode / getPropertyAsNode", () => {
	it("getChildNode returns the named child or null", () => {
		const child = makeNode({ id: "c" });
		expect(getChildNode(makeNode({ named: { child } }), "child")).toBe(child);
		expect(getChildNode(makeNode(), "child")).toBeNull();
	});
	it("getPropertyAsNode returns the referenced node or null", () => {
		const ref = makeNode({ id: "r" });
		expect(getPropertyAsNode(makeNode({ props: { p: ref } }), "p")).toBe(ref);
		expect(getPropertyAsNode(makeNode(), "p")).toBeNull();
		expect(getPropertyAsNode(makeNode({ props: { p: "not-a-node" } }), "p")).toBeNull();
	});
});

describe("num / getDouble", () => {
	it("num returns the long value or fallback", () => {
		expect(num(makeNode({ props: { n: 12 } }), "n")).toBe(12);
		expect(num(makeNode({ props: { n: "12" } }), "n")).toBe(12);
		expect(num(makeNode({ props: { n: "abc" } }), "n", 7)).toBe(7);
		expect(num(makeNode(), "n", 3)).toBe(3);
	});
	it("getDouble returns the double value or fallback", () => {
		expect(getDouble(makeNode({ props: { d: 1.5 } }), "d")).toBe(1.5);
		expect(getDouble(makeNode({ props: { d: "abc" } }), "d", 2)).toBe(2);
		expect(getDouble(makeNode(), "d", 4)).toBe(4);
	});
});

describe("getChildNodesByType", () => {
	it("keeps children of the requested type in order", () => {
		const a = makeNode({ id: "a", nodeTypes: ["T"] });
		const b = makeNode({ id: "b", nodeTypes: ["X"] });
		const c = makeNode({ id: "c", nodeTypes: ["T"] });
		expect(getChildNodesByType(makeNode({ children: [a, b, c] }), "T")).toEqual([a, c]);
	});
});

describe("getAsBoolean", () => {
	it("reads a boolean property with fallback", () => {
		expect(getAsBoolean(makeNode({ props: { flag: true } }), "flag")).toBe(true);
		expect(getAsBoolean(makeNode({ props: { flag: "true" } }), "flag")).toBe(true);
		expect(getAsBoolean(makeNode({ props: { flag: false } }), "flag", true)).toBe(false);
		expect(getAsBoolean(makeNode(), "flag", true)).toBe(true);
	});
});

describe("hasMixin", () => {
	it("returns true when the node carries the mixin/type, false otherwise", () => {
		expect(
			hasMixin(makeNode({ nodeTypes: ["sofmix:faqIntegration"] }), "sofmix:faqIntegration"),
		).toBe(true);
		expect(hasMixin(makeNode({ nodeTypes: ["jnt:content"] }), "sofmix:faqIntegration")).toBe(false);
	});
});

describe("getGlobalSettingsNode", () => {
	it("returns null when the site node has no such child", () => {
		expect(getGlobalSettingsNode("qr")).toBeNull();
	});
	it("resolves the settings node under contents/site-settings + declares the regex dep", () => {
		const settings = makeNode({ id: "settings-id" });
		const site = makeNode({
			path: "/sites/demo",
			named: { "contents/site-settings/qr": settings },
		});
		expect(getGlobalSettingsNode("qr", site)).toBe(settings);
		expect(addCacheDependency).toHaveBeenCalledWith({
			flushOnPathMatchingRegexp: "/sites/demo/contents/site-settings/[^/]+$",
		});
	});
});

describe("defensive branches — safePath / findAncestor", () => {
	it("safePath swallows a throwing getPath (getChildNodesByType skips the regex dep)", () => {
		const throwing = {
			getPath: () => {
				throw new Error("transient node");
			},
			getNodes: () => [] as unknown as Iterable<JCRNodeWrapper>,
		} as unknown as JCRNodeWrapper;
		expect(getChildNodesByType(throwing, "T")).toEqual([]);
	});
	it("findAncestor returns null when getParent throws mid-walk", () => {
		const node = {
			isNodeType: () => false,
			getParent: () => {
				throw new Error("no parent");
			},
		} as unknown as JCRNodeWrapper;
		expect(findAncestor(node, "jnt:page")).toBeNull();
	});
	it("findAncestor returns null when the walk reaches a null parent", () => {
		const node = {
			isNodeType: () => false,
			getParent: () => null,
		} as unknown as JCRNodeWrapper;
		expect(findAncestor(node, "jnt:page")).toBeNull();
	});
});

describe("findAncestor / getAncestorUrl / getCurrentPageNode", () => {
	it("findAncestor walks up until it matches nodeType", () => {
		const grand = makeNode({ id: "g", nodeTypes: ["jnt:page"], url: "/g" });
		const parent = makeNode({ id: "p", parent: grand });
		const leaf = makeNode({ id: "l", parent });
		expect(findAncestor(leaf, "jnt:page")).toBe(grand);
	});
	it("findAncestor returns node itself if it matches", () => {
		const self = makeNode({ nodeTypes: ["jnt:page"] });
		expect(findAncestor(self, "jnt:page")).toBe(self);
	});
	it("findAncestor returns null when no ancestor matches", () => {
		expect(findAncestor(makeNode({ nodeTypes: ["nt:base"] }), "jnt:page")).toBeNull();
	});
	it("getAncestorUrl returns the URL of the matching ancestor or empty", () => {
		const page = makeNode({ nodeTypes: ["jnt:page"], url: "/p" });
		expect(getAncestorUrl(makeNode({ parent: page }))).toBe("/p");
		expect(getAncestorUrl(makeNode())).toBe("");
	});
	it("getCurrentPageNode reads the main resource and walks up to jnt:page", () => {
		const page = makeNode({ nodeTypes: ["jnt:page"] });
		const content = makeNode({ parent: page });
		const rc = {
			getMainResource: () => ({ getNode: () => content }),
		} as unknown as RenderContext;
		expect(getCurrentPageNode(rc)).toBe(page);
	});
	it("getCurrentPageNode returns null when the main resource is unreadable", () => {
		const rc = {
			getMainResource: () => {
				throw new Error("no main");
			},
		} as unknown as RenderContext;
		expect(getCurrentPageNode(rc)).toBeNull();
	});
});

describe("getDate", () => {
	it("returns display + iso when the property is a valid date", () => {
		// Minuit LOCAL, comme le produit le sélecteur de date de Jahia. Un
		// `Date.UTC(...)` ici passerait quel que soit le fuseau et ne dirait donc
		// rien du décalage que `iso` doit éviter.
		const millis = new Date(2026, 2, 12).getTime();
		const { display, iso } = getDate(
			makeNode({ props: { publishDate: { __millis: millis } } }),
			"publishDate",
			DEFAULT_DATE_FORMATTER,
		);
		expect(iso).toBe("2026-03-12");
		expect(display.length).toBeGreaterThan(0);
	});
	it("keeps the calendar day of a local-midnight date instead of shifting it in UTC", () => {
		// Repère : en Europe/Paris ce même instant vaut `2026-02-17T23:00:00Z`, donc
		// un `toISOString()` publierait `2026-02-17` — la veille de la date saisie.
		const millis = new Date(2026, 1, 18).getTime();
		expect(
			getDate(makeNode({ props: { publishDate: { __millis: millis } } }), "publishDate").iso,
		).toBe("2026-02-18");
	});
	it("returns empty strings when the property is missing", () => {
		expect(getDate(makeNode(), "publishDate")).toEqual({ display: "", iso: "" });
	});
	it("returns empty strings when the property is not a date", () => {
		expect(getDate(makeNode({ props: { publishDate: "nope" } }), "publishDate")).toEqual({
			display: "",
			iso: "",
		});
	});
});

describe("findChildByType / getWrapperItems", () => {
	it("findChildByType returns the first matching child or null", () => {
		const wrapper = makeNode({ nodeTypes: ["sofnt:list"] });
		expect(findChildByType(makeNode({ children: [wrapper] }), "sofnt:list")).toBe(wrapper);
		expect(findChildByType(makeNode(), "sofnt:list")).toBeNull();
	});
	it("getWrapperItems returns items of the requested type", () => {
		const item1 = makeNode({ id: "1", nodeTypes: ["sofnt:item"] });
		const item2 = makeNode({ id: "2", nodeTypes: ["sofnt:item"] });
		const other = makeNode({ id: "3", nodeTypes: ["sofnt:other"] });
		const wrapper = makeNode({ nodeTypes: ["sofnt:list"], children: [item1, item2, other] });
		const parent = makeNode({ children: [wrapper] });
		expect(getWrapperItems(parent, "sofnt:list", "sofnt:item")).toEqual([item1, item2]);
	});
	it("getWrapperItems returns [] when the wrapper is missing", () => {
		expect(getWrapperItems(makeNode(), "sofnt:list", "sofnt:item")).toEqual([]);
	});
});

describe("buildNodeUrl wiring", () => {
	it("imgUrl calls buildNodeUrl with the resolved reference node", () => {
		const ref = makeNode({ url: "/x" });
		imgUrl(makeNode({ props: { p: ref } }), "p");
		expect(buildNodeUrl).toHaveBeenCalled();
	});
});

// Contract tests — each JCR helper resolving a node MUST register a cache dep.
// These lock the behaviour so nobody re-introduces the AppShowcase live-cache bug.
describe("cache dependency contracts", () => {
	beforeEach(() => {
		vi.mocked(addCacheDependency).mockClear();
	});

	describe("getChildNode", () => {
		it("declares a cache dep on the resolved child", () => {
			const child = makeNode({ id: "child-id", path: "/parent/child" });
			const parent = makeNode({ named: { child } });
			getChildNode(parent, "child");
			expect(addCacheDependency).toHaveBeenCalledWith({ node: child });
		});
		it("does NOT declare a dep when the child is missing", () => {
			getChildNode(makeNode(), "missing");
			expect(addCacheDependency).not.toHaveBeenCalled();
		});
	});

	describe("getPropertyAsNode", () => {
		it("declares a cache dep on the weakreference target", () => {
			const target = makeNode({ id: "img-id" });
			getPropertyAsNode(makeNode({ props: { image: target } }), "image");
			expect(addCacheDependency).toHaveBeenCalledWith({ node: target });
		});
		it("does NOT declare a dep when the property is absent", () => {
			getPropertyAsNode(makeNode(), "image");
			expect(addCacheDependency).not.toHaveBeenCalled();
		});
	});

	describe("imgUrl / imgMeta / nodeUrl heritage", () => {
		it("imgUrl declares a dep on the referenced image node", () => {
			const target = makeNode({ url: "/img.png", id: "img-id" });
			imgUrl(makeNode({ props: { pic: target } }), "pic");
			expect(addCacheDependency).toHaveBeenCalledWith({ node: target });
		});
		it("imgMeta declares a dep on the referenced image node", () => {
			const target = makeNode({ url: "/img.png", id: "img-id" });
			imgMeta(makeNode({ props: { pic: target } }), "pic");
			expect(addCacheDependency).toHaveBeenCalledWith({ node: target });
		});
		it("nodeUrl(propertyName) declares a dep on the referenced node", () => {
			const target = makeNode({ url: "/target", id: "t-id" });
			nodeUrl(makeNode({ props: { link: target } }), "link");
			expect(addCacheDependency).toHaveBeenCalledWith({ node: target });
		});
	});

	describe("getChildNodesByType", () => {
		it("declares flushOnPathMatchingRegexp on parent + node dep on each child", () => {
			const c1 = makeNode({ id: "c1", nodeTypes: ["T"] });
			const c2 = makeNode({ id: "c2", nodeTypes: ["T"] });
			const other = makeNode({ id: "other", nodeTypes: ["X"] });
			const parent = makeNode({ path: "/p", children: [c1, other, c2] });
			getChildNodesByType(parent, "T");
			expect(addCacheDependency).toHaveBeenCalledWith({
				flushOnPathMatchingRegexp: "/p/[^/]+$",
			});
			expect(addCacheDependency).toHaveBeenCalledWith({ node: c1 });
			expect(addCacheDependency).toHaveBeenCalledWith({ node: c2 });
			expect(addCacheDependency).not.toHaveBeenCalledWith({ node: other });
		});
	});

	describe("findChildByType", () => {
		it("declares flushOnPathMatchingRegexp + node dep on the first matching child", () => {
			const match = makeNode({ id: "match", nodeTypes: ["T"] });
			const other = makeNode({ id: "other", nodeTypes: ["X"] });
			const parent = makeNode({ path: "/p", children: [other, match] });
			findChildByType(parent, "T");
			expect(addCacheDependency).toHaveBeenCalledWith({
				flushOnPathMatchingRegexp: "/p/[^/]+$",
			});
			expect(addCacheDependency).toHaveBeenCalledWith({ node: match });
		});
		it("still declares flushOnPathMatchingRegexp when no match", () => {
			findChildByType(makeNode({ path: "/p" }), "T");
			expect(addCacheDependency).toHaveBeenCalledWith({
				flushOnPathMatchingRegexp: "/p/[^/]+$",
			});
		});
	});

	describe("getWrapperItems", () => {
		it("declares wrapper dep + flushOnPathMatchingRegexp + per-item dep", () => {
			const item1 = makeNode({ id: "i1", nodeTypes: ["sofnt:item"] });
			const item2 = makeNode({ id: "i2", nodeTypes: ["sofnt:item"] });
			const wrapper = makeNode({
				path: "/p/list",
				nodeTypes: ["sofnt:list"],
				children: [item1, item2],
			});
			const parent = makeNode({ path: "/p", children: [wrapper] });
			getWrapperItems(parent, "sofnt:list", "sofnt:item");
			expect(addCacheDependency).toHaveBeenCalledWith({ node: wrapper });
			expect(addCacheDependency).toHaveBeenCalledWith({
				flushOnPathMatchingRegexp: "/p/list/[^/]+$",
			});
			expect(addCacheDependency).toHaveBeenCalledWith({ node: item1 });
			expect(addCacheDependency).toHaveBeenCalledWith({ node: item2 });
		});
	});

	describe("findAncestor", () => {
		it("declares a cache dep on the resolved ancestor", () => {
			const grand = makeNode({ id: "g", nodeTypes: ["jnt:page"] });
			const parent = makeNode({ id: "p", parent: grand });
			const leaf = makeNode({ id: "leaf", parent });
			findAncestor(leaf, "jnt:page");
			expect(addCacheDependency).toHaveBeenCalledWith({ node: grand });
		});
	});

	// Le mode édition ne passe pas par AggregateCacheFilter : il n'y a aucun cache
	// de fragment à invalider. Enregistrer des dépendances y est du travail pur perdu,
	// répété des centaines de fois par rendu de page (lenteur du mode contribution).
	describe("edit mode short-circuit", () => {
		beforeEach(() => {
			vi.mocked(isEditMode).mockReturnValue(true);
		});

		it("getChildNode declares nothing", () => {
			const child = makeNode({ id: "child-id", path: "/parent/child" });
			getChildNode(makeNode({ named: { child } }), "child");
			expect(addCacheDependency).not.toHaveBeenCalled();
		});

		it("getPropertyAsNode declares nothing", () => {
			const target = makeNode({ id: "img-id" });
			getPropertyAsNode(makeNode({ props: { image: target } }), "image");
			expect(addCacheDependency).not.toHaveBeenCalled();
		});

		it("getChildNodesByType declares nothing but still returns the children", () => {
			const c1 = makeNode({ id: "c1", nodeTypes: ["T"] });
			const parent = makeNode({ path: "/p", children: [c1] });
			expect(getChildNodesByType(parent, "T")).toEqual([c1]);
			expect(addCacheDependency).not.toHaveBeenCalled();
		});

		it("findChildByType declares nothing but still returns the match", () => {
			const match = makeNode({ id: "m", nodeTypes: ["T"] });
			const parent = makeNode({ path: "/p", children: [match] });
			expect(findChildByType(parent, "T")).toBe(match);
			expect(addCacheDependency).not.toHaveBeenCalled();
		});

		it("getWrapperItems declares nothing but still returns the items", () => {
			const item = makeNode({ id: "i1", nodeTypes: ["sofnt:item"] });
			const wrapper = makeNode({
				path: "/p/list",
				nodeTypes: ["sofnt:list"],
				children: [item],
			});
			const parent = makeNode({ path: "/p", children: [wrapper] });
			expect(getWrapperItems(parent, "sofnt:list", "sofnt:item")).toEqual([item]);
			expect(addCacheDependency).not.toHaveBeenCalled();
		});

		it("findAncestor declares nothing but still resolves the ancestor", () => {
			const grand = makeNode({ id: "g", nodeTypes: ["jnt:page"] });
			const leaf = makeNode({ id: "leaf", parent: grand });
			expect(findAncestor(leaf, "jnt:page")).toBe(grand);
			expect(addCacheDependency).not.toHaveBeenCalled();
		});
	});

	// Un chemin JCR contient très fréquemment des métacaractères regex — surtout un
	// `.` (noms de fichiers, nœuds générés depuis un titre). Injecté brut, un `.`
	// matche n'importe quel caractère et élargit silencieusement la portée du flush.
	describe("regex-metacharacter escaping in paths", () => {
		it("escapes dots in getChildNodesByType", () => {
			const parent = makeNode({ path: "/sites/demo/home/page.v2", children: [] });
			getChildNodesByType(parent, "T");
			expect(addCacheDependency).toHaveBeenCalledWith({
				flushOnPathMatchingRegexp: "/sites/demo/home/page\\.v2/[^/]+$",
			});
		});

		it("escapes parentheses and plus signs in findChildByType", () => {
			const parent = makeNode({ path: "/p/offre (2024)+bis", children: [] });
			findChildByType(parent, "T");
			expect(addCacheDependency).toHaveBeenCalledWith({
				flushOnPathMatchingRegexp: "/p/offre \\(2024\\)\\+bis/[^/]+$",
			});
		});

		it("leaves a metacharacter-free path untouched", () => {
			const parent = makeNode({ path: "/p", children: [] });
			getChildNodesByType(parent, "T");
			expect(addCacheDependency).toHaveBeenCalledWith({
				flushOnPathMatchingRegexp: "/p/[^/]+$",
			});
		});
	});
});

/* ──────────────────────────────────────────────────────────────────────────
   str → substitution des variables de simulation

   `str` est LE point de branchement : c'est lui qui fait bénéficier tout texte contributeur
   de la substitution, sans qu'aucun composant ait à s'en occuper. Sans ces cas, retirer cet
   appel ne casserait aucun test — et la fonctionnalité disparaîtrait en silence.
   ────────────────────────────────────────────────────────────────────────── */

describe("str — variables de simulation", () => {
	afterEach(() => stopInsuranceVars());

	it("substitue les jetons quand le registre résout", () => {
		vi.mocked(getRequestAttribute).mockReturnValue({
			exampleAmount: "3 000 €",
			insurance: { taea: "1,20 %" },
		});
		startInsuranceVars(true);

		const node = makeNode({ props: { mention: "TAEA {{taea}}" } });
		expect(str(node, "mention")).toBe("TAEA 1,20 %");
	});

	/* Mode édition : jetons visibles, aucun appel — et le contrôle continue malgré tout. */
	it("laisse les jetons bruts et n'interroge rien en mode édition", () => {
		vi.mocked(getRequestAttribute).mockClear();
		startInsuranceVars(false);

		const node = makeNode({ props: { mention: "TAEA {{taea}}" } });
		expect(str(node, "mention")).toBe("TAEA {{taea}}");
		expect(getRequestAttribute).not.toHaveBeenCalled();
	});

	it("alimente le panneau d'audit depuis un jeton inexistant", () => {
		startInsuranceVars(false);

		const node = makeNode({ props: { mention: "{{tauxMagique}}" } });
		str(node, "mention");

		expect(readUnresolvedInsuranceVars()).toMatchObject([
			{ token: "tauxMagique", reason: "unknown-token" },
		]);
	});

	it("registre désarmé → texte intact, aucune interrogation", () => {
		vi.mocked(getRequestAttribute).mockClear();
		stopInsuranceVars();

		const node = makeNode({ props: { mention: "TAEA {{taea}}" } });
		expect(str(node, "mention")).toBe("TAEA {{taea}}");
		expect(getRequestAttribute).not.toHaveBeenCalled();
	});
});
