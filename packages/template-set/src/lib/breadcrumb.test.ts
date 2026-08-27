import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";

// Data-driven jcr helpers (str/getAsBoolean read straight from the makeNode bag) and a
// buildNodeUrl that just echoes the node's URL. This keeps the test scoped to the
// breadcrumb-walking logic itself.
vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("@jahia/javascript-modules-library", () => ({
	buildNodeUrl: vi.fn((node: { getUrl(): string }) => node.getUrl()),
}));
vi.mock("#lib/renderContext", () => ({ addCacheDependency: vi.fn() }));

import {
	resolveCurrentPage,
	buildBreadcrumb,
	getBreadcrumbStyle,
	buildBreadcrumbLayoutProps,
} from "./breadcrumb";

/** Wraps a node in a RenderContext whose main resource resolves to it. */
const rcWith = (getNode: () => JCRNodeWrapper): RenderContext =>
	({ getMainResource: () => ({ getNode }) }) as unknown as RenderContext;

/** Grafts `getName` onto a fake node — makeNode doesn't implement it, but the label fallback uses it. */
const withName = (node: JCRNodeWrapper, name: string): JCRNodeWrapper =>
	Object.assign(node, { getName: () => name });

// ============================================================================
// resolveCurrentPage — helper partagé qui remonte à la 1re jnt:page
// ============================================================================

describe("resolveCurrentPage", () => {
	it("returns null when the main resource node cannot be resolved", () => {
		const rc = {
			getMainResource: () => ({
				getNode: () => {
					throw new Error("boom");
				},
			}),
		} as unknown as RenderContext;
		expect(resolveCurrentPage(rc)).toBeNull();
	});

	it("returns the node itself when it is already a jnt:page", () => {
		const page = makeNode({ nodeTypes: ["jnt:page"] });
		expect(resolveCurrentPage(rcWith(() => page))).toBe(page);
	});

	it("walks up ancestors until finding a jnt:page when main resource is content", () => {
		const site = makeNode({ nodeTypes: ["jnt:virtualsite"] });
		const page = makeNode({ nodeTypes: ["jnt:page"], parent: site });
		const content = makeNode({ nodeTypes: ["spnt:news"], parent: page });
		expect(resolveCurrentPage(rcWith(() => content))).toBe(page);
	});

	it("returns null when walking hits a parentless content node before a page", () => {
		const content = makeNode({ nodeTypes: ["spnt:news"] });
		expect(resolveCurrentPage(rcWith(() => content))).toBeNull();
	});
});

// ============================================================================
// getBreadcrumbStyle — lit breadcrumbStyle sur une page déjà résolue
// ============================================================================

describe("getBreadcrumbStyle", () => {
	it("returns onLight when pageNode is null", () => {
		expect(getBreadcrumbStyle(null)).toBe("onLight");
	});

	it("returns onLight fallback when breadcrumbStyle property is missing", () => {
		const page = makeNode({ nodeTypes: ["jnt:page"] });
		expect(getBreadcrumbStyle(page)).toBe("onLight");
	});

	it("returns onDark when the mixin property is set to onDark", () => {
		const page = makeNode({
			nodeTypes: ["jnt:page"],
			props: { breadcrumbStyle: "onDark" },
		});
		expect(getBreadcrumbStyle(page)).toBe("onDark");
	});

	it("returns onLight for any value that is not exactly onDark", () => {
		const page = makeNode({
			nodeTypes: ["jnt:page"],
			props: { breadcrumbStyle: "something-else" },
		});
		expect(getBreadcrumbStyle(page)).toBe("onLight");
	});
});

// ============================================================================
// buildBreadcrumb — signature refondue : prend directement un pageNode
// ============================================================================

describe("buildBreadcrumb", () => {
	it("returns [] when pageNode is null", () => {
		expect(buildBreadcrumb(null)).toEqual([]);
	});

	it("builds root → current from a page hierarchy and flags the current page", () => {
		const site = makeNode({ nodeTypes: ["jnt:virtualsite"] });
		const root = makeNode({
			nodeTypes: ["jnt:page"],
			props: { "jcr:title": "Accueil" },
			url: "/",
			parent: site,
		});
		const mid = makeNode({
			nodeTypes: ["jnt:page"],
			props: { "jcr:title": "Crédits" },
			url: "/credits",
			parent: root,
		});
		const current = makeNode({
			nodeTypes: ["jnt:page"],
			props: { "jcr:title": "Crédit Auto" },
			url: "/credits/auto",
			parent: mid,
		});

		expect(buildBreadcrumb(current)).toEqual([
			{ label: "Accueil", url: "/", isCurrent: false, isClickable: true, id: "id" },
			{ label: "Crédits", url: "/credits", isCurrent: false, isClickable: true, id: "id" },
			{ label: "Crédit Auto", url: "/credits/auto", isCurrent: true, isClickable: false, id: "id" },
		]);
	});

	it("skips pages flagged hideFromBreadcrumb while keeping their descendants", () => {
		const site = makeNode({ nodeTypes: ["jnt:virtualsite"] });
		const root = makeNode({
			nodeTypes: ["jnt:page"],
			props: { "jcr:title": "Accueil" },
			url: "/",
			parent: site,
		});
		const hidden = makeNode({
			nodeTypes: ["jnt:page"],
			props: { "jcr:title": "Groupe", "hideFromBreadcrumb": true },
			url: "/groupe",
			parent: root,
		});
		const current = makeNode({
			nodeTypes: ["jnt:page"],
			props: { "jcr:title": "Feuille" },
			url: "/groupe/feuille",
			parent: hidden,
		});

		expect(buildBreadcrumb(current)).toEqual([
			{ label: "Accueil", url: "/", isCurrent: false, isClickable: true, id: "id" },
			{ label: "Feuille", url: "/groupe/feuille", isCurrent: true, isClickable: false, id: "id" },
		]);
	});

	it("uses breadcrumbCustomLabel to override jcr:title", () => {
		const site = makeNode({ nodeTypes: ["jnt:virtualsite"] });
		const current = makeNode({
			nodeTypes: ["jnt:page"],
			props: { "jcr:title": "Titre long SEO", "breadcrumbCustomLabel": "Court" },
			url: "/p",
			parent: site,
		});

		const items = buildBreadcrumb(current);
		expect(items).toHaveLength(1);
		expect(items[0].label).toBe("Court");
	});

	it("renders jnt:navMenuText nodes as non-clickable, label-only entries", () => {
		const site = makeNode({ nodeTypes: ["jnt:virtualsite"] });
		const root = makeNode({
			nodeTypes: ["jnt:page"],
			props: { "jcr:title": "Accueil" },
			url: "/",
			parent: site,
		});
		const group = makeNode({
			nodeTypes: ["jnt:navMenuText"],
			props: { "jcr:title": "Regroupement", "breadcrumbCustomLabel": "Ignoré" },
			url: "/should-be-ignored",
			parent: root,
		});
		const current = makeNode({
			nodeTypes: ["jnt:page"],
			props: { "jcr:title": "Page" },
			url: "/regroupement/page",
			parent: group,
		});

		expect(buildBreadcrumb(current)).toEqual([
			{ label: "Accueil", url: "/", isCurrent: false, isClickable: true, id: "id" },
			{ label: "Regroupement", url: "", isCurrent: false, isClickable: false, id: "id" },
			{ label: "Page", url: "/regroupement/page", isCurrent: true, isClickable: false, id: "id" },
		]);
	});

	it("falls back to the node name when neither custom label nor jcr:title is set", () => {
		const site = makeNode({ nodeTypes: ["jnt:virtualsite"] });
		const current = withName(
			makeNode({ nodeTypes: ["jnt:page"], url: "/p", parent: site }),
			"node-name",
		);

		const items = buildBreadcrumb(current);
		expect(items[0].label).toBe("node-name");
	});

	it("walks past non-breadcrumb ancestors between pages", () => {
		const site = makeNode({ nodeTypes: ["jnt:virtualsite"] });
		const root = makeNode({
			nodeTypes: ["jnt:page"],
			props: { "jcr:title": "Accueil" },
			url: "/",
			parent: site,
		});
		const intermediate = makeNode({ nodeTypes: ["jnt:contentList"], parent: root });
		const current = makeNode({
			nodeTypes: ["jnt:page"],
			props: { "jcr:title": "Page" },
			url: "/page",
			parent: intermediate,
		});

		expect(buildBreadcrumb(current)).toEqual([
			{ label: "Accueil", url: "/", isCurrent: false, isClickable: true, id: "id" },
			{ label: "Page", url: "/page", isCurrent: true, isClickable: false, id: "id" },
		]);
	});

	it("returns [] when every collected page is hidden (no item to flag current)", () => {
		const site = makeNode({ nodeTypes: ["jnt:virtualsite"] });
		const current = makeNode({
			nodeTypes: ["jnt:page"],
			props: { "jcr:title": "Cachée", "hideFromBreadcrumb": true },
			url: "/cachee",
			parent: site,
		});

		expect(buildBreadcrumb(current)).toEqual([]);
	});

	it("stops collecting (without throwing) when an ancestor has no parent", () => {
		const current = makeNode({
			nodeTypes: ["jnt:page"],
			props: { "jcr:title": "Orpheline" },
			url: "/orpheline",
		});

		expect(buildBreadcrumb(current)).toEqual([
			{ label: "Orpheline", url: "/orpheline", isCurrent: true, isClickable: false, id: "id" },
		]);
	});
});

// ============================================================================
// buildBreadcrumbLayoutProps — helper d'entrée unique pour templates Jahia
// ============================================================================

describe("buildBreadcrumbLayoutProps", () => {
	it("bundles items and theme in one call (typical page)", () => {
		const site = makeNode({ nodeTypes: ["jnt:virtualsite"] });
		const root = makeNode({
			nodeTypes: ["jnt:page"],
			props: { "jcr:title": "Accueil" },
			url: "/",
			parent: site,
		});
		const current = makeNode({
			nodeTypes: ["jnt:page"],
			props: { "jcr:title": "Crédit Auto", "breadcrumbStyle": "onDark" },
			url: "/credits/auto",
			parent: root,
		});

		const result = buildBreadcrumbLayoutProps(rcWith(() => current));

		expect(result.theme).toBe("onDark");
		expect(result.items).toHaveLength(2);
		expect(result.items[0].label).toBe("Accueil");
		expect(result.items[1].label).toBe("Crédit Auto");
		expect(result.items[1].isCurrent).toBe(true);
	});

	it("returns empty items + onLight fallback when renderContext is broken", () => {
		const rc = {
			getMainResource: () => ({
				getNode: () => {
					throw new Error("boom");
				},
			}),
		} as unknown as RenderContext;

		expect(buildBreadcrumbLayoutProps(rc)).toEqual({
			items: [],
			theme: "onLight",
		});
	});

	it("defaults theme to onLight when the mixin property is missing", () => {
		const site = makeNode({ nodeTypes: ["jnt:virtualsite"] });
		const current = makeNode({
			nodeTypes: ["jnt:page"],
			props: { "jcr:title": "Page" },
			url: "/p",
			parent: site,
		});

		const result = buildBreadcrumbLayoutProps(rcWith(() => current));
		expect(result.theme).toBe("onLight");
	});
});
