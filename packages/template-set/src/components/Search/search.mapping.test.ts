import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("@jahia/javascript-modules-library", () => ({
	buildNodeUrl: vi.fn((node: { getUrl(): string }) => node.getUrl()),
}));

import { mapSearchProps } from "./search.mapping";

describe("mapSearchProps", () => {
	it("falls back to safe defaults when the node has no url / searchBlockTarget", () => {
		expect(mapSearchProps(makeNode())).toEqual({
			action: "",
			placeholder: "Rechercher",
			allResultsLabel: "Voir tous les résultats",
			allResultsHref: "",
			suggestions: [],
			results: [],
			searchEndpoint: undefined,
			minLetters: 3,
			maxSuggestions: 5,
		});
	});

	it("resolves the action URL from the linked `url` node", () => {
		const search = makeNode({ props: { url: makeNode({ url: "/recherche.html" }) } });
		const props = mapSearchProps(search);
		expect(props.action).toBe("/recherche.html");
		expect(props.allResultsHref).toBe("/recherche.html");
	});

	it("builds the suggest endpoint and reads the config from searchBlockTarget", () => {
		const target = makeNode({
			url: "/site/search.html",
			props: { minLettersBeforeSuggest: 2, maxSuggestionsForheader: 8 },
			children: [
				makeNode({ nodeTypes: ["spnt:searchTermeSuggestion"], props: { term: "crédit auto" } }),
			],
		});
		const search = makeNode({
			props: { url: makeNode({ url: "/recherche.html" }), searchBlockTarget: target },
		});

		const props = mapSearchProps(search);
		expect(props.searchEndpoint).toBe("/site/search.suggest.html.ajax");
		expect(props.minLetters).toBe(2);
		expect(props.maxSuggestions).toBe(8);
		expect(props.suggestions).toEqual([
			{ label: "crédit auto", termDisplayTitle: "/recherche.html?query=cr%C3%A9dit%20auto" },
		]);
	});

	it("drops term suggestions with no term, and falls back to `#` without an action URL", () => {
		const target = makeNode({
			url: "/site/search.html",
			children: [
				makeNode({ nodeTypes: ["spnt:searchTermeSuggestion"], props: { term: "" } }),
				makeNode({ nodeTypes: ["spnt:searchTermeSuggestion"], props: { term: "rachat" } }),
			],
		});
		const search = makeNode({ props: { searchBlockTarget: target } });

		expect(mapSearchProps(search).suggestions).toEqual([
			{ label: "rachat", termDisplayTitle: "#" },
		]);
	});

	it("maps external-URL result suggestions", () => {
		const target = makeNode({
			url: "/site/search.html",
			children: [
				makeNode({
					nodeTypes: ["spnt:searchSuggestion"],
					props: {
						targetExternalUrl: "https://ext.example/page",
						targetExternalTitle: "External page",
						description: "A result",
					},
				}),
			],
		});
		const search = makeNode({ props: { searchBlockTarget: target } });

		expect(mapSearchProps(search).results).toEqual([
			{ title: "External page", description: "A result", href: "https://ext.example/page" },
		]);
	});

	it("maps internal-page result suggestions, falling back to the node name for the label", () => {
		const target = makeNode({
			url: "/site/search.html",
			children: [
				makeNode({
					nodeTypes: ["spnt:searchSuggestion"],
					props: {
						targetPage: makeNode({ url: "/credit-auto.html", displayableName: "Crédit auto" }),
						description: "Financez votre véhicule",
					},
				}),
				// Page with no title in the rendered locale: the node name keeps the link clickable.
				makeNode({
					nodeTypes: ["spnt:searchSuggestion"],
					props: {
						targetPage: makeNode({
							url: "/rachat.html",
							path: "/sites/s/rachat",
							displayableName: "",
						}),
					},
				}),
			],
		});
		const search = makeNode({ props: { searchBlockTarget: target } });

		expect(mapSearchProps(search).results).toEqual([
			{ title: "Crédit auto", description: "Financez votre véhicule", href: "/credit-auto.html" },
			{ title: "rachat", description: "", href: "/rachat.html" },
		]);
	});

	it("drops suggestions whose target resolves to neither an internal page nor a complete external pair", () => {
		const target = makeNode({
			url: "/site/search.html",
			children: [
				// Unresolvable reference + external URL without its title: nothing to link to.
				makeNode({
					nodeTypes: ["spnt:searchSuggestion"],
					props: { targetExternalUrl: "https://ext.example/page", description: "Orpheline" },
				}),
			],
		});
		const search = makeNode({ props: { searchBlockTarget: target } });

		expect(mapSearchProps(search).results).toEqual([]);
	});

	it("appends FAQ suggestions as `?question=<slug>` results, skipping incomplete ones", () => {
		const target = makeNode({
			url: "/site/search.html",
			children: [
				makeNode({
					nodeTypes: ["spnt:searchSuggestion"],
					props: {
						targetExternalUrl: "https://ext.example/page",
						targetExternalTitle: "External page",
						description: "A result",
					},
				}),
				makeNode({
					nodeTypes: ["spnt:searchFaqSuggestion"],
					props: {
						questionTitle: "Comment résilier ?",
						questionslug: "comment-resilier",
						questionDescription: "La marche à suivre",
					},
				}),
				// No slug → dropped, exactly like the `searchFaqSuggestion` authoring view.
				makeNode({
					nodeTypes: ["spnt:searchFaqSuggestion"],
					props: { questionTitle: "Sans slug", questionslug: "" },
				}),
			],
		});
		const search = makeNode({
			props: { url: makeNode({ url: "/recherche.html" }), searchBlockTarget: target },
		});

		expect(mapSearchProps(search).results).toEqual([
			{ title: "External page", description: "A result", href: "https://ext.example/page" },
			{
				title: "Comment résilier ?",
				description: "La marche à suivre",
				href: "/recherche.html?question=comment-resilier",
			},
		]);
	});
});
