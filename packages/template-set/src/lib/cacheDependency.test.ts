import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeNode } from "#test/jahia";
import type { JCRNodeWrapper } from "org.jahia.services.content";

vi.mock("./renderContext", () => ({
	addCacheDependency: vi.fn(),
	isEditMode: vi.fn(() => false),
}));

import { addCacheDependency, isEditMode } from "./renderContext";
import {
	escapeRegExpPath,
	addNodeCacheDependency,
	addDirectChildrenCacheDependency,
	addSubtreeCacheDependency,
} from "./cacheDependency";

/** Nœud dont `getPath()` lève — simule un état de session dégradé. */
const throwingNode = (): JCRNodeWrapper =>
	({
		getPath: () => {
			throw new Error("path unresolvable");
		},
	}) as unknown as JCRNodeWrapper;

beforeEach(() => {
	vi.mocked(isEditMode).mockReturnValue(false);
	vi.mocked(addCacheDependency).mockClear();
});

describe("escapeRegExpPath", () => {
	it("escapes dots — the most frequent metacharacter in JCR paths", () => {
		expect(escapeRegExpPath("/sites/demo/files/photo.avif")).toBe("/sites/demo/files/photo\\.avif");
	});

	it("escapes parentheses, plus and other metacharacters", () => {
		expect(escapeRegExpPath("/p/offre (2024)+bis")).toBe("/p/offre \\(2024\\)\\+bis");
		expect(escapeRegExpPath("/p/a*b?c")).toBe("/p/a\\*b\\?c");
		expect(escapeRegExpPath("/p/[x]{1}")).toBe("/p/\\[x\\]\\{1\\}");
		expect(escapeRegExpPath("/p/a|b^c$d")).toBe("/p/a\\|b\\^c\\$d");
		expect(escapeRegExpPath("/p/a\\b")).toBe("/p/a\\\\b");
	});

	it("leaves slashes, dashes and colons untouched (not regex metacharacters)", () => {
		expect(escapeRegExpPath("/sites/demo/home/ma-page")).toBe("/sites/demo/home/ma-page");
	});

	it("produces a pattern that matches the original path literally", () => {
		const path = "/sites/demo/home/page.v2 (final)";
		expect(new RegExp(`^${escapeRegExpPath(path)}$`).test(path)).toBe(true);
		// Sans échappement, le `.` matcherait n'importe quel caractère.
		expect(new RegExp(`^${escapeRegExpPath(path)}$`).test("/sites/demo/home/pageXv2 (final)")).toBe(
			false,
		);
	});
});

describe("addNodeCacheDependency", () => {
	it("declares a node dependency", () => {
		const node = makeNode({ id: "n1" });
		addNodeCacheDependency(node);
		expect(addCacheDependency).toHaveBeenCalledWith({ node });
	});

	it("is a no-op in edit mode", () => {
		vi.mocked(isEditMode).mockReturnValue(true);
		addNodeCacheDependency(makeNode({ id: "n1" }));
		expect(addCacheDependency).not.toHaveBeenCalled();
	});

	it("does not read the path (works on a node whose getPath throws)", () => {
		expect(() => addNodeCacheDependency(throwingNode())).not.toThrow();
		expect(addCacheDependency).toHaveBeenCalledTimes(1);
	});
});

describe("addDirectChildrenCacheDependency", () => {
	it("declares a first-level-only regex", () => {
		addDirectChildrenCacheDependency(makeNode({ path: "/p" }));
		expect(addCacheDependency).toHaveBeenCalledWith({
			flushOnPathMatchingRegexp: "/p/[^/]+$",
		});
	});

	it("escapes metacharacters in the parent path", () => {
		addDirectChildrenCacheDependency(makeNode({ path: "/p/page.v2" }));
		expect(addCacheDependency).toHaveBeenCalledWith({
			flushOnPathMatchingRegexp: "/p/page\\.v2/[^/]+$",
		});
	});

	it("appends an optional relative sub-path", () => {
		addDirectChildrenCacheDependency(makeNode({ path: "/sites/demo" }), "contents/site-settings");
		expect(addCacheDependency).toHaveBeenCalledWith({
			flushOnPathMatchingRegexp: "/sites/demo/contents/site-settings/[^/]+$",
		});
	});

	it("does not match a grandchild (scope stays at depth 1)", () => {
		addDirectChildrenCacheDependency(makeNode({ path: "/p" }));
		const { flushOnPathMatchingRegexp } = vi.mocked(addCacheDependency).mock.calls[0][0];
		const re = new RegExp(flushOnPathMatchingRegexp as string);
		expect(re.test("/p/child")).toBe(true);
		expect(re.test("/p/child/grandchild")).toBe(false);
	});

	it("is a no-op in edit mode", () => {
		vi.mocked(isEditMode).mockReturnValue(true);
		addDirectChildrenCacheDependency(makeNode({ path: "/p" }));
		expect(addCacheDependency).not.toHaveBeenCalled();
	});

	it("is a no-op when the path is unresolvable", () => {
		expect(() => addDirectChildrenCacheDependency(throwingNode())).not.toThrow();
		expect(addCacheDependency).not.toHaveBeenCalled();
	});
});

describe("addSubtreeCacheDependency", () => {
	it("declares a whole-subtree regex", () => {
		addSubtreeCacheDependency(makeNode({ path: "/p" }));
		expect(addCacheDependency).toHaveBeenCalledWith({
			flushOnPathMatchingRegexp: "/p(/.*)?",
		});
	});

	it("covers the root itself and any depth", () => {
		addSubtreeCacheDependency(makeNode({ path: "/p" }));
		const { flushOnPathMatchingRegexp } = vi.mocked(addCacheDependency).mock.calls[0][0];
		const re = new RegExp(`^${flushOnPathMatchingRegexp as string}$`);
		expect(re.test("/p")).toBe(true);
		expect(re.test("/p/child")).toBe(true);
		expect(re.test("/p/a/b/c/deep")).toBe(true);
		expect(re.test("/other")).toBe(false);
	});

	it("escapes metacharacters in the root path", () => {
		addSubtreeCacheDependency(makeNode({ path: "/p/chat.bot" }));
		expect(addCacheDependency).toHaveBeenCalledWith({
			flushOnPathMatchingRegexp: "/p/chat\\.bot(/.*)?",
		});
	});

	it("is a no-op in edit mode", () => {
		vi.mocked(isEditMode).mockReturnValue(true);
		addSubtreeCacheDependency(makeNode({ path: "/p" }));
		expect(addCacheDependency).not.toHaveBeenCalled();
	});

	it("is a no-op when the path is unresolvable", () => {
		expect(() => addSubtreeCacheDependency(throwingNode())).not.toThrow();
		expect(addCacheDependency).not.toHaveBeenCalled();
	});
});
