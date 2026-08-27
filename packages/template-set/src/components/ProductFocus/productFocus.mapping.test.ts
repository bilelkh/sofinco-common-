import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("./ProductFocusItem/productFocusItem.mapping", () => ({
	mapProductFocusItem: vi.fn((n: { getIdentifier(): string }) => ({
		id: n.getIdentifier(),
	})),
}));

import { mapProductFocusProps } from "./productFocus.mapping";

const item = (id: string) => makeNode({ id, nodeTypes: ["sofnt:productFocusItem"] });

const buildParent = (
	opts: {
		props?: Record<string, string>;
		leftItems?: ReturnType<typeof item>[];
		rightItems?: ReturnType<typeof item>[];
	} = {},
) => {
	// Both wrappers share the SAME node type — the mapper resolves them by NAME
	// via `getWrapperItems(..., wrapperName)`. In the fake node, `named` map is
	// what `getChildNode(node, name)` reads (hasNode/getNode).
	const leftList = makeNode({
		nodeTypes: ["sofnt:productFocusItemList"],
		children: opts.leftItems ?? [item("l1"), item("l2")],
	});
	const rightList = makeNode({
		nodeTypes: ["sofnt:productFocusItemList"],
		children: opts.rightItems ?? [item("r1"), item("r2")],
	});

	return makeNode({
		nodeTypes: ["sofnt:productFocus"],
		props: {
			"jcr:title": "Notre crédit renouvelable dans le détail",
			subtitle: "Tous les avantages du Crédit Renouvelable Sofinco",
			image: "/mockup.webp",
			titleLevel: "h2",
			titleStyle: "h2",
			backgroundColor: "#D8ECF9",
			...opts.props,
		},
		named: { leftFeatures: leftList, rightFeatures: rightList },
	});
};

describe("mapProductFocusProps → ProductFocusProps", () => {
	it("maps the full shape (title, subtitle, image, features L/R, backgroundColor)", () => {
		const result = mapProductFocusProps(buildParent());

		expect(result.title).toEqual({
			children: "Notre crédit renouvelable dans le détail",
			as: "h2",
			visualStyle: "h2",
		});
		expect(result.subtitle).toBe("Tous les avantages du Crédit Renouvelable Sofinco");
		expect(result.imageSrc).toBe("/mockup.webp");
		expect(result.backgroundColor).toBe("#D8ECF9");
		expect(result.leftFeatures).toEqual([{ id: "l1" }, { id: "l2" }]);
		expect(result.rightFeatures).toEqual([{ id: "r1" }, { id: "r2" }]);
	});

	it("`title` undefined when jcr:title is empty (DS omits the heading)", () => {
		const result = mapProductFocusProps(buildParent({ props: { "jcr:title": "" } }));
		expect(result.title).toBeUndefined();
	});

	it("`title.as` / `title.visualStyle` reflect sofmix:headingStyle", () => {
		const result = mapProductFocusProps(
			buildParent({ props: { titleLevel: "h1", titleStyle: "h3" } }),
		);
		expect(result.title).toEqual({
			children: "Notre crédit renouvelable dans le détail",
			as: "h1",
			visualStyle: "h3",
		});
	});

	it("`title` falls back to h2 when heading style props are absent (legacy nodes)", () => {
		const parent = makeNode({
			nodeTypes: ["sofnt:productFocus"],
			props: { "jcr:title": "Titre", image: "/img.webp" },
		});
		const result = mapProductFocusProps(parent);
		expect(result.title?.as).toBe("h2");
		expect(result.title?.visualStyle).toBe("h2");
	});

	it("`subtitle` undefined when empty (no orphan `<p>` on the DS side)", () => {
		const result = mapProductFocusProps(buildParent({ props: { subtitle: "" } }));
		expect(result.subtitle).toBeUndefined();
	});

	it("`imageSrc` = '' when image is unpublished/deleted (degraded state)", () => {
		const result = mapProductFocusProps(buildParent({ props: { image: "" } }));
		expect(result.imageSrc).toBe("");
	});

	it("`backgroundColor` falls back to the default when the field is empty", () => {
		// Aligned with the CND autocreated default (#f5f9fc).
		// Also covers the missing-property case via the same defensive `|| DEFAULT`.
		const result = mapProductFocusProps(buildParent({ props: { backgroundColor: "" } }));
		expect(result.backgroundColor).toBe("#f5f9fc");
	});

	it("`backgroundColor` falls back to the default when the property is absent (legacy nodes)", () => {
		const bare = makeNode({
			nodeTypes: ["sofnt:productFocus"],
			props: { "jcr:title": "T", image: "/i.webp" },
		});
		const result = mapProductFocusProps(bare);
		expect(result.backgroundColor).toBe("#f5f9fc");
	});

	it("features empty when the wrapper list is absent (legacy nodes / autocreation skipped)", () => {
		const bare = makeNode({
			nodeTypes: ["sofnt:productFocus"],
			props: { "jcr:title": "T", image: "/i.webp" },
		});
		const result = mapProductFocusProps(bare);
		expect(result.leftFeatures).toEqual([]);
		expect(result.rightFeatures).toEqual([]);
	});

	it("respects JCR order (contributor drag-drop)", () => {
		const result = mapProductFocusProps(
			buildParent({ leftItems: [item("l3"), item("l1"), item("l2")] }),
		);
		expect(result.leftFeatures.map((f) => f.id)).toEqual(["l3", "l1", "l2"]);
	});

	it("supports uneven counts per side", () => {
		const result = mapProductFocusProps(
			buildParent({
				leftItems: [item("l1")],
				rightItems: [item("r1"), item("r2"), item("r3")],
			}),
		);
		expect(result.leftFeatures).toHaveLength(1);
		expect(result.rightFeatures).toHaveLength(3);
	});

	it("distinguishes left from right despite the shared wrapper type (name-based lookup)", () => {
		// Regression test: both wrappers are of type `sofnt:productFocusItemList`.
		// If `getWrapperItems` fell back to a type-based lookup here, it would
		// return the same wrapper for both calls → left and right would be equal.
		const result = mapProductFocusProps(
			buildParent({
				leftItems: [item("only-left")],
				rightItems: [item("only-right")],
			}),
		);
		expect(result.leftFeatures.map((f) => f.id)).toEqual(["only-left"]);
		expect(result.rightFeatures.map((f) => f.id)).toEqual(["only-right"]);
	});
});
