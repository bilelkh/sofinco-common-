import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import { mapFaqBlockPropsClient, mapFaqBlockPropsServer } from "./faqBlock.mapping";

const props = {
	"jcr:title": "FAQ",
	"subtitle": "Sous-titre",
	"image": "faq.jpg",
	"imageAlt": "alt",
};

describe("mapFaqBlockPropsClient", () => {
	it("maps block props and embeds faq items", () => {
		const item = makeNode({
			id: "i",
			nodeTypes: ["sofnt:faqItem"],
			props: { "jcr:title": "Q", "answer": "A" },
		});
		const node = makeNode({ props, nodeTypes: ["sofnt:faq", "sofmix:faqItems"], children: [item] });
		expect(mapFaqBlockPropsClient(node)).toEqual({
			title: "FAQ",
			subtitle: "Sous-titre",
			imageUrl: "faq.jpg",
			imageAlt: "alt",
			titleAs: "h4",
			titleStyle: "h2",
			useExternalSource: false,
			items: [{ id: "i", question: "Q", answer: "A" }],
		});
	});

	it("resolves the optional bottom link child into LinkProps", () => {
		const link = makeNode({
			id: "l",
			nodeTypes: ["sofnt:link"],
			props: {
				"j:linkType": "external",
				"j:url": "https://sofinco.fr/faq",
				"j:linkTitle": "Consulter la FAQ",
				"j:target": "_blank",
			},
		});
		const node = makeNode({
			props,
			nodeTypes: ["sofnt:faq", "sofmix:faqItems"],
			children: [link],
		});
		expect(mapFaqBlockPropsClient(node).link).toEqual({
			href: "https://sofinco.fr/faq",
			label: "Consulter la FAQ",
			isExternal: true,
			iconLeft: undefined,
			iconRight: undefined,
			iconVariant: "primary",
		});
	});

	it("leaves link undefined when no link child is present", () => {
		const node = makeNode({ props, nodeTypes: ["sofnt:faq", "sofmix:faqItems"] });
		expect(mapFaqBlockPropsClient(node).link).toBeUndefined();
	});

	it("reads the sofmix:headingStyle level and style, falling back to h4/h2", () => {
		const styled = makeNode({
			props: { ...props, titleLevel: "h3", titleStyle: "h1" },
			nodeTypes: ["sofnt:faq", "sofmix:headingStyle", "sofmix:faqItems"],
		});
		const styledProps = mapFaqBlockPropsClient(styled);
		expect(styledProps.titleAs).toBe("h3");
		expect(styledProps.titleStyle).toBe("h1");

		const bare = makeNode({ props, nodeTypes: ["sofnt:faq", "sofmix:faqItems"] });
		const bareProps = mapFaqBlockPropsClient(bare);
		expect(bareProps.titleAs).toBe("h4");
		expect(bareProps.titleStyle).toBe("h2");
	});

	it("maps the integration config and drops items when sofmix:faqIntegration is present", () => {
		const item = makeNode({
			id: "i",
			nodeTypes: ["sofnt:faqItem"],
			props: { "jcr:title": "Q", "answer": "A" },
		});
		const node = makeNode({
			props: {
				...props,
				jsUrl: "https://assets.app.smart-tribune.com/sofinco/faq.js",
				kbId: "198",
				thematicsFilter: "pret, assurance",
				tagsFilter: ["credit", "auto"],
				tagsOr: true,
				cookieOptin: true,
				searchFiltered: true,
				headerId: "faq-header",
				extraParams: ['customResponses:["sofinco-2057"]', "locale:fr"],
			},
			nodeTypes: ["sofnt:faq", "sofmix:faqIntegration"],
			children: [item],
		});
		const result = mapFaqBlockPropsClient(node);
		expect(result.useExternalSource).toBe(true);
		expect(result.items).toEqual([]);
		expect(result.integration).toEqual({
			jsUrl: "https://assets.app.smart-tribune.com/sofinco/faq.js",
			kbId: "198",
			thematicsFilter: "pret, assurance",
			tagsFilter: "credit,auto",
			tagsOr: true,
			cookieOptin: true,
			searchFiltered: true,
			headerId: "faq-header",
			extraParams: ['customResponses:["sofinco-2057"]', "locale:fr"],
		});
	});
});

describe("mapFaqBlockPropsServer", () => {
	it("maps block props with server faq items for the manual source (node attached)", () => {
		const item = makeNode({
			id: "i",
			nodeTypes: ["sofnt:faqItem"],
			props: { "jcr:title": "Q", "answer": "A" },
		});
		const result = mapFaqBlockPropsServer(
			makeNode({ props, nodeTypes: ["sofnt:faq", "sofmix:faqItems"], children: [item] }),
		);
		expect(result.useExternalSource).toBe(false);
		expect(result.items[0]).toMatchObject({ id: "i", node: item });
	});

	it("maps the integration config and drops items when sofmix:faqIntegration is present", () => {
		const item = makeNode({
			id: "i",
			nodeTypes: ["sofnt:faqItem"],
			props: { "jcr:title": "Q", "answer": "A" },
		});
		const result = mapFaqBlockPropsServer(
			makeNode({
				props: { ...props, jsUrl: "https://x/faq.js", kbId: "198" },
				nodeTypes: ["sofnt:faq", "sofmix:faqIntegration"],
				children: [item],
			}),
		);
		expect(result.useExternalSource).toBe(true);
		expect(result.items).toEqual([]);
		expect(result.integration).toMatchObject({ jsUrl: "https://x/faq.js", kbId: "198" });
	});
});
