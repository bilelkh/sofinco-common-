import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import { mapSeoBlockProps, mapSeoBlockServerProps } from "./seoBlock.mapping";

describe("mapSeoBlockProps", () => {
	it("maps title as TitleProps + section color + isCentered", () => {
		const node = makeNode({
			id: "seo-1",
			props: {
				"jcr:title": "Titre SEO",
				"textColor": "accent",
				"titleSize": "h3",
				"content": "<p>Contenu</p>",
			},
		});
		expect(mapSeoBlockProps(node)).toEqual({
			title: { children: "Titre SEO", as: "h3", visualStyle: "h3" },
			sections: [{ id: "seo-1", content: "<p>Contenu</p>", color: "accent" }],
			isCentered: false,
		});
	});

	it("carries the contributed color on the single section", () => {
		const node = makeNode({ id: "x", props: { textColor: "green", content: "<p>Texte</p>" } });
		const result = mapSeoBlockProps(node);
		expect(result.sections[0].color).toBe("green");
	});

	it("falls back to 'primary' for a missing or unknown colour", () => {
		expect(mapSeoBlockProps(makeNode({ props: { content: "<p>Texte</p>" } })).sections[0].color).toBe(
			"primary",
		);
		expect(
			mapSeoBlockProps(makeNode({ props: { textColor: "purple", content: "<p>Texte</p>" } }))
				.sections[0].color,
		).toBe("primary");
	});

	// `content` n'est PAS obligatoire sur la CND : un bloc titre seul est une
	// contribution valide et ne doit pas produire de section vide (qui
	// rendrait une div de contenu vide côté DS).
	it("produit `sections: []` quand le texte n'est pas contribué", () => {
		expect(mapSeoBlockProps(makeNode({ props: { "jcr:title": "Titre seul" } })).sections).toEqual(
			[],
		);
	});

	it("produit `sections: []` quand le texte est une chaîne vide", () => {
		const node = makeNode({ props: { "jcr:title": "Titre seul", "content": "" } });
		expect(mapSeoBlockProps(node).sections).toEqual([]);
	});

	it("garde le titre intact sur un bloc sans texte", () => {
		const node = makeNode({ props: { "jcr:title": "Titre seul", "titleSize": "h3" } });
		expect(mapSeoBlockProps(node).title).toEqual({
			children: "Titre seul",
			as: "h3",
			visualStyle: "h3",
		});
	});

	it("falls back to 'h2' for a missing or unknown title level", () => {
		const bare = mapSeoBlockProps(makeNode());
		expect(bare.title.as).toBe("h2");
		expect(bare.title.visualStyle).toBe("h2");

		const unknown = mapSeoBlockProps(makeNode({ props: { titleSize: "h7" } }));
		expect(unknown.title.as).toBe("h2");
		expect(unknown.title.visualStyle).toBe("h2");
	});

	it("uses the node identifier as the section id", () => {
		const node = makeNode({ id: "node-42", props: { content: "<p>Texte</p>" } });
		expect(mapSeoBlockProps(node).sections[0].id).toBe("node-42");
	});

	it("`isCentered` defaults to false when the property is absent (legacy nodes)", () => {
		expect(mapSeoBlockProps(makeNode()).isCentered).toBe(false);
	});

	it("`isCentered` reflects the boolean property when set to true", () => {
		const node = makeNode({ props: { isCentered: true } });
		expect(mapSeoBlockProps(node).isCentered).toBe(true);
	});
});

describe("mapSeoBlockServerProps (edit-mode preview mapper)", () => {
	// Signature : `(dsProps)` — aucun accès JCR direct.
	type SeoBlockPropsShape = Parameters<typeof mapSeoBlockServerProps>[0];
	const buildDsProps = (overrides: Partial<SeoBlockPropsShape> = {}): SeoBlockPropsShape => ({
		title: { children: "Titre", as: "h2", visualStyle: "h2" },
		sections: [{ id: "seo-1", content: "<p>Contenu</p>", color: "primary" }],
		isCentered: false,
		...overrides,
	});

	it("ne signale rien quand title et content sont remplis", () => {
		expect(mapSeoBlockServerProps(buildDsProps())).toEqual({ missingTitle: false });
	});

	it("`missingTitle` true quand dsProps.title.children est vide", () => {
		const result = mapSeoBlockServerProps(
			buildDsProps({ title: { children: "", as: "h2", visualStyle: "h2" } }),
		);
		expect(result.missingTitle).toBe(true);
	});

	// Le texte est facultatif : son absence ne doit jamais remonter dans la
	// bannière « Champs obligatoires manquants ».
	it("ne signale rien quand le texte est vide mais le titre rempli", () => {
		expect(
			mapSeoBlockServerProps(
				buildDsProps({ sections: [{ id: "seo-1", content: "", color: "primary" }] }),
			),
		).toEqual({ missingTitle: false });
	});

	it("ne signale rien quand aucune section n'est contribuée", () => {
		expect(mapSeoBlockServerProps(buildDsProps({ sections: [] }))).toEqual({
			missingTitle: false,
		});
	});

	it("ne remonte aucun flag `missingContent` (champ devenu facultatif)", () => {
		const result = mapSeoBlockServerProps(buildDsProps({ sections: [] }));
		expect(result).not.toHaveProperty("missingContent");
	});

	it("signale uniquement le titre quand tout est vide", () => {
		const result = mapSeoBlockServerProps(
			buildDsProps({
				title: { children: "", as: "h2", visualStyle: "h2" },
				sections: [],
			}),
		);
		expect(result).toEqual({ missingTitle: true });
	});
});
