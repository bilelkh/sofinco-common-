import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("@jahia/javascript-modules-library", () => ({
	buildNodeUrl: vi.fn((node: { getUrl(): string }) => node.getUrl()),
}));

import { readLink, readPrefixedLink, readLinkChild } from "./readLink";

describe("readLink", () => {
	it("resolves an internal link node with icons", () => {
		const target = makeNode({ url: "/dest" });
		const node = makeNode({
			props: {
				"j:linkType": "internal",
				"j:linknode": target,
				"j:linkTitle": "Mon lien",
				"j:target": "_blank",
				"iconLeft": "arrow-left",
				"iconRight": "arrow-right",
				"iconVariant": "accent",
			},
		});
		expect(readLink(node)).toEqual({
			href: "/dest",
			label: "Mon lien",
			target: "_blank",
			iconLeft: "arrow-left",
			iconRight: "arrow-right",
			iconVariant: "accent",
		});
	});

	it("uses j:url when no linked node, and jcr:title when no linkTitle", () => {
		const node = makeNode({
			props: { "j:linkType": "external", "j:url": "https://x", "jcr:title": "Titre" },
		});
		const data = readLink(node);
		expect(data?.href).toBe("https://x");
		expect(data?.label).toBe("Titre");
		expect(data?.iconVariant).toBe("primary"); // invalid/absent variant falls back
	});

	it("returns null when the link type is 'none'", () => {
		expect(readLink(makeNode({ props: { "j:linkType": "none" } }))).toBeNull();
	});

	it("returns null when no href can be resolved", () => {
		expect(readLink(makeNode({ props: { "j:linkType": "external" } }))).toBeNull();
	});

	it("returns null when no label can be resolved", () => {
		const node = makeNode({ props: { "j:linkType": "external", "j:url": "https://x" } });
		expect(readLink(node)).toBeNull();
	});

	it("supports a custom link-type property name", () => {
		const node = makeNode({
			props: { "downloadApp": "external", "j:url": "https://app", "jcr:title": "App" },
		});
		expect(readLink(node, "downloadApp")?.href).toBe("https://app");
	});
});

describe("readPrefixedLink", () => {
	it("resolves an internal prefixed link", () => {
		const target = makeNode({ url: "/n" });
		const node = makeNode({
			props: {
				ctaLinkType: "internal",
				ctaInternalNode: target,
				ctaLabel: "Go",
				ctaTarget: "_blank",
			},
		});
		expect(readPrefixedLink(node, "cta")).toEqual({
			href: "/n",
			label: "Go",
			target: "_blank",
			iconVariant: "primary",
		});
	});

	it("resolves an external prefixed link", () => {
		const node = makeNode({
			props: { ctaLinkType: "external", ctaExternalUrl: "https://x", ctaLabel: "L" },
		});
		expect(readPrefixedLink(node, "cta")?.href).toBe("https://x");
	});

	it("returns null for none / missing href / missing label", () => {
		expect(readPrefixedLink(makeNode({ props: { ctaLinkType: "none" } }), "cta")).toBeNull();
		expect(readPrefixedLink(makeNode({ props: { ctaLinkType: "external" } }), "cta")).toBeNull();
		expect(
			readPrefixedLink(
				makeNode({ props: { ctaLinkType: "external", ctaExternalUrl: "https://x" } }),
				"cta",
			),
		).toBeNull();
	});
});

describe("readLinkChild", () => {
	it("reads the named child link", () => {
		const linkNode = makeNode({
			props: { "j:linkType": "external", "j:url": "https://x", "jcr:title": "L" },
		});
		const parent = makeNode({ named: { link: linkNode } });
		expect(readLinkChild(parent)?.href).toBe("https://x");
	});

	it("falls back to the first sofnt:link child", () => {
		const linkNode = makeNode({
			nodeTypes: ["sofnt:link"],
			props: { "j:linkType": "external", "j:url": "https://y", "jcr:title": "L" },
		});
		const parent = makeNode({ children: [linkNode] });
		expect(readLinkChild(parent)?.href).toBe("https://y");
	});

	it("returns null when there is no link child", () => {
		expect(readLinkChild(makeNode())).toBeNull();
	});
});
