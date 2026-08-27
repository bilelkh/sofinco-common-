import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

// `#lib/jcr` is mocked once here — the mock is inherited transitively by
// `../Shared/HeadingStyle/headingStyle.mapping` (readTitleLevel/readTitleStyle)
// so we don't need a dedicated mock for the shared helpers.
vi.mock("#lib/jcr", () => import("#test/jahia"));

// Mock the 3 sub-mappers — the wrapper mapper is tested in isolation
// (delegation contract) ; the sub-mappers have their own unit tests.
//
// `mapProductFocusProps` returns the FULL ProductFocus shape (with
// title/subtitle/backgroundColor). The wrapper mapper is expected to STRIP
// those 3 keys because `ArrayFocusWrapperProps.productFocus` is typed as
// `Omit<ProductFocusProps, "backgroundColor" | "title" | "subtitle">`.
vi.mock("../ProductFocus/productFocus.mapping", () => ({
	mapProductFocusProps: vi.fn(() => ({
		title: { children: "Contributor-set title", as: "h2" as const, visualStyle: "h2" as const },
		subtitle: "Contributor-set subtitle",
		backgroundColor: "#ff0000",
		imageSrc: "/mock.webp",
		leftFeatures: [],
		rightFeatures: [],
	})),
}));
vi.mock("../SeoBlock/seoBlock.mapping", () => ({
	mapSeoBlockProps: vi.fn(() => ({
		title: { children: "Mock SEO", as: "h2" as const, visualStyle: "h2" as const },
		sections: [],
		isCentered: false,
	})),
}));
vi.mock("../InsuranceFocus/insuranceFocus.mapping", () => ({
	mapInsuranceFocusProps: vi.fn(() => ({ __mock: "insuranceFocus" })),
}));

import {
	mapArrayFocusWrapperProps,
	mapArrayFocusWrapperServerProps,
} from "./arrayFocusWrapper.mapping";

const buildWrapper = (
	opts: {
		props?: Record<string, string>;
		productFocus?: boolean;
		seoBlock?: boolean;
		insuranceFocus?: boolean;
	} = { productFocus: true, seoBlock: true, insuranceFocus: true },
) => {
	const named: Record<string, ReturnType<typeof makeNode>> = {};
	if (opts.productFocus !== false) {
		named.productFocus = makeNode({ id: "pf", nodeTypes: ["sofnt:productFocus"] });
	}
	if (opts.seoBlock !== false) {
		named.seoBlock = makeNode({ id: "sb", nodeTypes: ["sofnt:seoBlock"] });
	}
	if (opts.insuranceFocus !== false) {
		named.insuranceFocus = makeNode({ id: "if", nodeTypes: ["sofnt:insuranceFocus"] });
	}
	return makeNode({
		nodeTypes: ["sofnt:arrayFocusWrapper"],
		props: {
			"jcr:title": "Notre crédit renouvelable dans le détail",
			subtitle: "Tous les avantages en un clin d'œil",
			backgroundColor: "#DFF1FC",
			titleLevel: "h2",
			titleStyle: "h2",
			...(opts.props ?? {}),
		},
		named,
	});
};

describe("mapArrayFocusWrapperProps", () => {
	it("builds sectionHeading + backgroundColor + delegates to the 3 sub-mappers", () => {
		const result = mapArrayFocusWrapperProps(buildWrapper());

		expect(result.sectionHeading).toEqual({
			title: "Notre crédit renouvelable dans le détail",
			subtitle: "Tous les avantages en un clin d'œil",
			titleAs: "h2",
			visualStyle: "h2",
			align: "center",
		});
		expect(result.backgroundColor).toBe("#DFF1FC");
		expect(result.seoBlock).toEqual({
			title: { children: "Mock SEO", as: "h2", visualStyle: "h2" },
			sections: [],
			isCentered: false,
		});
		expect(result.insuranceFocus).toEqual({ __mock: "insuranceFocus" });
	});

	it("strips title/subtitle/backgroundColor from productFocus (matches Omit<> React type)", () => {
		// The mocked `mapProductFocusProps` returns title/subtitle/backgroundColor.
		// The wrapper mapper must NOT propagate them : the wrapper's
		// `sectionHeading` owns the heading and the wrapper paints the shared
		// background — the child receives `backgroundColor="transparent"` from
		// the React component itself.
		const result = mapArrayFocusWrapperProps(buildWrapper());

		expect(result.productFocus).toEqual({
			imageSrc: "/mock.webp",
			leftFeatures: [],
			rightFeatures: [],
		});
		expect(result.productFocus).not.toHaveProperty("title");
		expect(result.productFocus).not.toHaveProperty("subtitle");
		expect(result.productFocus).not.toHaveProperty("backgroundColor");
	});

	it("`sectionHeading.title` undefined when jcr:title is empty (DS hides the title)", () => {
		const result = mapArrayFocusWrapperProps(buildWrapper({ props: { "jcr:title": "" } }));
		expect(result.sectionHeading.title).toBeUndefined();
	});

	it("`sectionHeading.subtitle` undefined when empty", () => {
		const result = mapArrayFocusWrapperProps(buildWrapper({ props: { subtitle: "" } }));
		expect(result.sectionHeading.subtitle).toBeUndefined();
	});

	it("`titleAs` / `visualStyle` reflect sofmix:headingStyle via shared helpers", () => {
		const result = mapArrayFocusWrapperProps(
			buildWrapper({ props: { titleLevel: "h1", titleStyle: "h3" } }),
		);
		expect(result.sectionHeading.titleAs).toBe("h1");
		expect(result.sectionHeading.visualStyle).toBe("h3");
	});

	it("`titleAs` / `visualStyle` fall back to h2 for unknown values", () => {
		const result = mapArrayFocusWrapperProps(
			buildWrapper({ props: { titleLevel: "h9", titleStyle: "xxl" } }),
		);
		expect(result.sectionHeading.titleAs).toBe("h2");
		expect(result.sectionHeading.visualStyle).toBe("h2");
	});

	it("`sectionHeading.align` is always 'center' (wrapper convention)", () => {
		expect(mapArrayFocusWrapperProps(buildWrapper()).sectionHeading.align).toBe("center");
	});

	it("`backgroundColor` falls back to the default (#DFF1FC) when the field is empty", () => {
		const result = mapArrayFocusWrapperProps(
			buildWrapper({ props: { backgroundColor: "" } }),
		);
		expect(result.backgroundColor).toBe("#DFF1FC");
	});

	it("productFocus degrades to body-only empty shape when the child is absent", () => {
		const result = mapArrayFocusWrapperProps(
			buildWrapper({ productFocus: false, seoBlock: true, insuranceFocus: true }),
		);
		expect(result.productFocus).toEqual({
			imageSrc: "",
			leftFeatures: [],
			rightFeatures: [],
		});
	});

	it("seoBlock degrades to typed empty shape when the child is absent", () => {
		const result = mapArrayFocusWrapperProps(
			buildWrapper({ productFocus: true, seoBlock: false, insuranceFocus: true }),
		);
		expect(result.seoBlock).toEqual({
			title: { children: "", as: "h3", visualStyle: "h3" },
			sections: [],
			isCentered: false,
		});
	});

	it("insuranceFocus degrades to typed empty shape when the child is absent", () => {
		// Typed fallback — symmetric with productFocus / seoBlock. Guards the DS
		// against null deref (`.title.children`, `.cta.href`) mid-migration.
		const result = mapArrayFocusWrapperProps(
			buildWrapper({ productFocus: true, seoBlock: true, insuranceFocus: false }),
		);
		expect(result.insuranceFocus).toEqual({
			title: { children: "", as: "h3", visualStyle: "h3" },
			description: "",
			imageSrc: "",
			imageAlt: "",
			cta: {
				label: "",
				href: "",
				target: "_self",
				ctaSection: "insurance-focus",
				variant: "accent",
			},
		});
	});
});

describe("mapArrayFocusWrapperServerProps (edit-mode preview mapper)", () => {
	it("returns wrapper-level fields only (children are rendered via <RenderChild>)", () => {
		const result = mapArrayFocusWrapperServerProps(buildWrapper());

		expect(result).toEqual({
			backgroundColor: "#DFF1FC",
			title: "Notre crédit renouvelable dans le détail",
			subtitle: "Tous les avantages en un clin d'œil",
			hasHeader: true,
		});
	});

	it("`hasHeader` is true when only title is set", () => {
		const result = mapArrayFocusWrapperServerProps(
			buildWrapper({ props: { subtitle: "" } }),
		);
		expect(result.hasHeader).toBe(true);
		expect(result.subtitle).toBe("");
	});

	it("`hasHeader` is true when only subtitle is set", () => {
		const result = mapArrayFocusWrapperServerProps(
			buildWrapper({ props: { "jcr:title": "" } }),
		);
		expect(result.hasHeader).toBe(true);
		expect(result.title).toBe("");
	});

	it("`hasHeader` is false when both title and subtitle are empty", () => {
		const result = mapArrayFocusWrapperServerProps(
			buildWrapper({ props: { "jcr:title": "", subtitle: "" } }),
		);
		expect(result.hasHeader).toBe(false);
	});

	it("`backgroundColor` falls back to the default when the field is empty", () => {
		const result = mapArrayFocusWrapperServerProps(
			buildWrapper({ props: { backgroundColor: "" } }),
		);
		expect(result.backgroundColor).toBe("#DFF1FC");
	});

	it("`backgroundColor` falls back to the default when the property is absent (legacy nodes)", () => {
		const bare = makeNode({ nodeTypes: ["sofnt:arrayFocusWrapper"], props: {} });
		expect(mapArrayFocusWrapperServerProps(bare).backgroundColor).toBe("#DFF1FC");
	});

	it("does NOT walk the 3 children (they're rendered inline in the server view)", () => {
		// Regression guard : the edit-mode mapper must stay minimal — no
		// getChildNode / sub-mapper calls (those would pull heavy dependencies
		// for a preview that only needs the wrapper's own fields).
		const result = mapArrayFocusWrapperServerProps(buildWrapper());
		expect(result).not.toHaveProperty("productFocus");
		expect(result).not.toHaveProperty("seoBlock");
		expect(result).not.toHaveProperty("insuranceFocus");
	});
});
