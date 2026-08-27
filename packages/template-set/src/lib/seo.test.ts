import { describe, it, expect, vi } from "vitest";
import { makeNode, type PropValue } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import {
	resolvePageDescription,
	resolvePageKeywords,
	resolvePageTitle,
	resolveRobotsContent,
	SEO_PAGE_OPTIONS_MIXIN,
} from "./seo";

const page = (props: Record<string, PropValue>, withMixin = true) =>
	makeNode({
		nodeTypes: withMixin ? ["jnt:page", SEO_PAGE_OPTIONS_MIXIN] : ["jnt:page"],
		props,
	});

describe("resolvePageTitle", () => {
	it("returns titleSEO when the mixin is present and the property is set", () => {
		expect(resolvePageTitle(page({ titleSEO: "Crédit conso — Sofinco" }), "Page")).toBe(
			"Crédit conso — Sofinco",
		);
	});

	it("falls back to the current title when titleSEO is missing", () => {
		expect(resolvePageTitle(page({}), "Page")).toBe("Page");
	});

	it("falls back to the current title when titleSEO is blank", () => {
		expect(resolvePageTitle(page({ titleSEO: "   " }), "Page")).toBe("Page");
	});

	it("falls back to the current title when the page does not carry the mixin", () => {
		expect(resolvePageTitle(page({ titleSEO: "Ignoré" }, false), "Page")).toBe("Page");
	});

	it("falls back to the current title when the page node is unresolvable", () => {
		expect(resolvePageTitle(null, "Page")).toBe("Page");
	});

	it("falls back to the current title when isNodeType throws (mixin absent du runtime)", () => {
		const node = makeNode();
		node.isNodeType = () => {
			throw new Error("unknown node type");
		};
		expect(resolvePageTitle(node, "Page")).toBe("Page");
	});
});

describe("resolvePageDescription", () => {
	it("returns jcr:description", () => {
		expect(resolvePageDescription(page({ "jcr:description": "Financez votre projet" }))).toBe(
			"Financez votre projet",
		);
	});

	it("does not depend on the SEO mixin", () => {
		expect(resolvePageDescription(page({ "jcr:description": "Desc" }, false))).toBe("Desc");
	});

	it("trims surrounding whitespace", () => {
		expect(resolvePageDescription(page({ "jcr:description": "  Desc  " }))).toBe("Desc");
	});

	it("returns '' when the property is missing or blank", () => {
		expect(resolvePageDescription(page({}))).toBe("");
		expect(resolvePageDescription(page({ "jcr:description": "   " }))).toBe("");
	});

	it("returns '' when the page node is unresolvable", () => {
		expect(resolvePageDescription(null)).toBe("");
	});
});

describe("resolvePageKeywords", () => {
	it("joins the j:tagList values in authoring order", () => {
		expect(
			resolvePageKeywords(page({ "j:tagList": ["crédit conso", "prêt personnel", "rachat"] })),
		).toBe("crédit conso, prêt personnel, rachat");
	});

	it("does not depend on the SEO mixin", () => {
		expect(resolvePageKeywords(page({ "j:tagList": ["tag"] }, false))).toBe("tag");
	});

	it("trims each tag and drops the blank ones", () => {
		expect(resolvePageKeywords(page({ "j:tagList": ["  crédit  ", "   ", "prêt"] }))).toBe(
			"crédit, prêt",
		);
	});

	it("returns '' when there is no tag", () => {
		expect(resolvePageKeywords(page({}))).toBe("");
		expect(resolvePageKeywords(page({ "j:tagList": [] }))).toBe("");
	});

	it("returns '' when the page node is unresolvable", () => {
		expect(resolvePageKeywords(null)).toBe("");
	});
});

describe("resolveRobotsContent", () => {
	it("combines noindex and nofollow", () => {
		expect(resolveRobotsContent(page({ noindex: true, nofollow: true }))).toBe("noindex, nofollow");
	});

	it("returns noindex alone", () => {
		expect(resolveRobotsContent(page({ noindex: true }))).toBe("noindex");
	});

	it("returns nofollow alone", () => {
		expect(resolveRobotsContent(page({ nofollow: true }))).toBe("nofollow");
	});

	it("returns null when both flags are false", () => {
		expect(resolveRobotsContent(page({ noindex: false, nofollow: false }))).toBeNull();
	});

	it("returns null when the properties are not set", () => {
		expect(resolveRobotsContent(page({}))).toBeNull();
	});

	it("returns null when the page does not carry the mixin", () => {
		expect(resolveRobotsContent(page({ noindex: true }, false))).toBeNull();
	});

	it("returns null when the page node is unresolvable", () => {
		expect(resolveRobotsContent(null)).toBeNull();
	});
});
