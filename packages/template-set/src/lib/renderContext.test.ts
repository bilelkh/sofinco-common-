import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@jahia/javascript-modules-library", () => ({
	useServerContext: vi.fn(),
	server: { render: { addCacheDependency: vi.fn() } },
}));

import { useServerContext, server } from "@jahia/javascript-modules-library";
import type { RenderContext } from "org.jahia.services.render";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import {
	addCacheDependency,
	isEditMode,
	isAuthoringMode,
	isMainResourceNode,
	getRequestAttribute,
	isHomePage,
	getHomePageUrl,
	resolveSiteName,
} from "./renderContext";

/** Site exposant les seules propriétés lues par `resolveSiteName`. */
const siteWithTitles = (props: Record<string, string>) => ({
	getHome: () => ({ getPath: () => "/site/home", getUrl: () => "/home" }),
	hasProperty: (name: string) => props[name] !== undefined,
	getProperty: (name: string) => ({ getString: () => props[name] }),
});

const makeRc = (over: Partial<Record<string, unknown>> = {}): RenderContext => {
	const rc = {
		isEditMode: () => true,
		// Contexte de contribution par défaut, cohérent avec `isEditMode: () => true` :
		// les deux méthodes existent sur le `RenderContext` réel, une fixture qui n'en
		// expose qu'une laisse passer les régressions de l'autre.
		isLiveMode: () => false,
		getMainResource: () => ({
			getNode: () => ({ getName: () => "home", getPath: () => "/site/home" }),
		}),
		getSite: () => ({ getHome: () => ({ getPath: () => "/site/home", getUrl: () => "/home" }) }),
		getRequest: () => ({ getAttribute: (n: string) => (n === "foo" ? "bar" : null) }),
		...over,
	};
	return rc as unknown as RenderContext;
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(useServerContext).mockReturnValue({ renderContext: makeRc() } as unknown as ReturnType<
		typeof useServerContext
	>);
});

describe("addCacheDependency", () => {
	it("delegates to server.render.addCacheDependency with the passed render context", () => {
		const rc = makeRc();
		const node = {} as JCRNodeWrapper;
		addCacheDependency({ node }, rc);
		expect(server.render.addCacheDependency).toHaveBeenCalledWith({ node }, rc);
	});

	it("falls back to the server-context render context when none is passed", () => {
		const fallbackRc = makeRc({ isEditMode: () => false });
		vi.mocked(useServerContext).mockReturnValue({
			renderContext: fallbackRc,
		} as unknown as ReturnType<typeof useServerContext>);

		addCacheDependency({ flushOnPathMatchingRegexp: "/p/[^/]+$" });

		expect(server.render.addCacheDependency).toHaveBeenCalledWith(
			{ flushOnPathMatchingRegexp: "/p/[^/]+$" },
			fallbackRc,
		);
	});

	it("forwards each attr shape unchanged (uuid / path)", () => {
		const rc = makeRc();
		addCacheDependency({ uuid: "abc" }, rc);
		expect(server.render.addCacheDependency).toHaveBeenCalledWith({ uuid: "abc" }, rc);
		addCacheDependency({ path: "/x/y" }, rc);
		expect(server.render.addCacheDependency).toHaveBeenCalledWith({ path: "/x/y" }, rc);
	});
});

describe("isEditMode", () => {
	it("reads the passed render context", () => {
		expect(isEditMode(makeRc({ isEditMode: () => false }))).toBe(false);
	});
	it("falls back to the server-context render context", () => {
		expect(isEditMode()).toBe(true);
	});
});

describe("isAuthoringMode", () => {
	/**
	 * Contexte de contribution : `isLiveMode` répond `false` quel que soit l'outil.
	 * Le mode nommé en second n'est pas lu par l'implémentation — il est posé pour
	 * que la fixture ressemble au `RenderContext` réel de ce mode-là, et pour
	 * documenter lequel des trois est en jeu.
	 */
	const authoring = (over: Partial<Record<string, unknown>> = {}) =>
		makeRc({ isEditMode: () => false, isLiveMode: () => false, ...over });

	it("is true in edit mode (Page Builder)", () => {
		expect(isAuthoringMode(authoring({ isEditMode: () => true }))).toBe(true);
	});

	it("is true in preview mode, which isEditMode alone misses", () => {
		const rc = authoring({ isPreviewMode: () => true });
		expect(isEditMode(rc)).toBe(false);
		expect(isAuthoringMode(rc)).toBe(true);
	});

	it("is true in contribute mode, which probing edit + preview alone misses", () => {
		// Le mode que l'énumération manuelle des sondes laissait passer.
		const rc = authoring({ isPreviewMode: () => false, isContributionMode: () => true });
		expect(isAuthoringMode(rc)).toBe(true);
	});

	it("is false in live mode — the only case where tags must fire", () => {
		expect(isAuthoringMode(makeRc({ isEditMode: () => false, isLiveMode: () => true }))).toBe(
			false,
		);
	});

	it("is false when isLiveMode is missing — absence means real navigation", () => {
		// Un contexte inattendu ne doit pas éteindre silencieusement le tracking.
		expect(isAuthoringMode({} as unknown as RenderContext)).toBe(false);
	});

	it("is false when isLiveMode throws", () => {
		const rc = makeRc({
			isLiveMode: () => {
				throw new Error("boom");
			},
		});
		expect(isAuthoringMode(rc)).toBe(false);
	});

	it("is false when isLiveMode returns a non-boolean — never infer authoring from noise", () => {
		// `!undefined` vaudrait `true` et couperait le tracking en production :
		// c'est précisément ce que la comparaison à `false` empêche.
		expect(isAuthoringMode(makeRc({ isLiveMode: () => undefined }))).toBe(false);
	});

	it("falls back to the server-context render context when none is passed", () => {
		expect(isAuthoringMode()).toBe(true);
	});
});

describe("isMainResourceNode", () => {
	it("compares the main resource node name", () => {
		const rc = makeRc();
		expect(isMainResourceNode(rc, "home")).toBe(true);
		expect(isMainResourceNode(rc, "other")).toBe(false);
	});
});

describe("getRequestAttribute", () => {
	it("returns the typed attribute or null", () => {
		expect(getRequestAttribute<string>("foo", makeRc())).toBe("bar");
		expect(getRequestAttribute<string>("missing", makeRc())).toBeNull();
	});
	it("falls back to the server-context render context when none is passed", () => {
		expect(getRequestAttribute<string>("foo")).toBe("bar");
		expect(getRequestAttribute<string>("missing")).toBeNull();
	});
});

describe("isHomePage", () => {
	it("is true when the main resource path equals the site home path", () => {
		expect(isHomePage(makeRc())).toBe(true);
	});
	it("is false when paths differ", () => {
		const rc = makeRc({
			getMainResource: () => ({
				getNode: () => ({ getName: () => "x", getPath: () => "/site/other" }),
			}),
		});
		expect(isHomePage(rc)).toBe(false);
	});
	it("is false (caught) when resolution throws", () => {
		const rc = makeRc({
			getMainResource: () => {
				throw new Error("boom");
			},
		});
		expect(isHomePage(rc)).toBe(false);
	});
	it("falls back to the server-context render context when none is passed", () => {
		expect(isHomePage()).toBe(true);
	});
});

describe("getHomePageUrl", () => {
	it("returns the home URL", () => {
		expect(getHomePageUrl(makeRc())).toBe("/home");
	});
	it("falls back to '/' when resolution throws", () => {
		const rc = makeRc({
			getSite: () => {
				throw new Error("boom");
			},
		});
		expect(getHomePageUrl(rc)).toBe("/");
	});
	it("falls back to the server-context render context when none is passed", () => {
		expect(getHomePageUrl()).toBe("/home");
	});
});

describe("resolveSiteName", () => {
	it("returns j:title when set", () => {
		const rc = makeRc({ getSite: () => siteWithTitles({ "j:title": "Sofinco" }) });
		expect(resolveSiteName(rc)).toBe("Sofinco");
	});

	it("falls back to jcr:title", () => {
		const rc = makeRc({
			getSite: () => siteWithTitles({ "j:title": "", "jcr:title": "Sofinco FR" }),
		});
		expect(resolveSiteName(rc)).toBe("Sofinco FR");
	});

	it("returns '' when neither property is set", () => {
		expect(resolveSiteName(makeRc({ getSite: () => siteWithTitles({}) }))).toBe("");
	});

	it("returns '' when the site is null or getSite throws", () => {
		expect(resolveSiteName(makeRc({ getSite: () => null }))).toBe("");
		expect(
			resolveSiteName(
				makeRc({
					getSite: () => {
						throw new Error("boom");
					},
				}),
			),
		).toBe("");
	});

	it("falls back to the server-context render context when none is passed", () => {
		vi.mocked(useServerContext).mockReturnValue({
			renderContext: makeRc({ getSite: () => siteWithTitles({ "j:title": "Sofinco" }) }),
		} as unknown as ReturnType<typeof useServerContext>);
		expect(resolveSiteName()).toBe("Sofinco");
	});
});
