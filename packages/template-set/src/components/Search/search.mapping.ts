import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { SearchProps, SearchResult, SearchSuggestion } from "sofinco-react";
import { getChildNodesByType, getPropertyAsNode, num, str } from "#lib/jcr";

/**
 * Maps a `sofnt:search` node to the serializable `SearchProps` consumed by the design-system
 * `Search` component — used both by the standalone Search Island (`default.server.tsx`) and by
 * the Menu Island, which renders `<Search>` inline rather than as a nested island slot.
 */
export function mapSearchProps(searchNode: JCRNodeWrapper): SearchProps {
	const urlNode = getPropertyAsNode(searchNode, "url");
	const searchBlockTarget = getPropertyAsNode(searchNode, "searchBlockTarget");
	const action = urlNode ? buildNodeUrl(urlNode) : "";

	// Live suggestions: the menu Search fetches the siteSearchBlock `suggest` view.
	// `searchBlockTarget` is a weakreference to a spnt:siteSearchBlock node, which also carries
	// the min-letters / max-suggestions config.
	//
	// Why `.suggest.html.ajax` and not `.json`: Jahia returns a 404 error page for any standalone
	// render of a content node in live, and the `.ajax` mode that bypasses that wall only works
	// for the `html` template type — never `json`. So we use a named HTML view (`suggest`) that
	// emits JSON, fetched via `.ajax`. That request also triggers `SearchFilter` (html), which
	// populates `searchBean` WITH the node, giving us both Jahia hits and the SmartTribune results.
	const searchEndpoint = searchBlockTarget
		? buildNodeUrl(searchBlockTarget).replace(/\.html$/, "") + ".suggest.html.ajax"
		: undefined;
	const minLetters = searchBlockTarget ? num(searchBlockTarget, "minLettersBeforeSuggest", 3) : 3;
	const maxSuggestions = searchBlockTarget
		? num(searchBlockTarget, "maxSuggestionsForheader", 5)
		: 5;

	// `SearchSuggestion.termDisplayTitle` is the href, not a label (see the design-system type).
	// Build the same URL the authoring view shows — `<page>?query=<term>` — so preview and live
	// agree and the results page opens pre-filled.
	const withQuery = (param: string, value: string) =>
		action ? `${action}?${param}=${encodeURIComponent(value)}` : "#";

	const suggestions: SearchSuggestion[] = searchBlockTarget
		? getChildNodesByType(searchBlockTarget, "spnt:searchTermeSuggestion")
				.map((n) => str(n, "term"))
				.filter((term) => term !== "")
				.map((term) => ({
					label: term,
					termDisplayTitle: withQuery("query", term),
				}))
		: [];

	// Internal page first, external pair overrides it — same precedence as the authoring view.
	// `getDisplayableName()` is empty for a page carrying no title in the rendered locale, and
	// the design-system `Link` renders `title` as its only anchor text: without the node-name
	// fallback the suggestion becomes an invisible, unclickable link. Entries that still end up
	// without both a URL and a label are dropped rather than rendered empty.
	const linkResults: SearchResult[] = searchBlockTarget
		? getChildNodesByType(searchBlockTarget, "spnt:searchSuggestion")
				.map((n) => {
					const targetPage = getPropertyAsNode(n, "targetPage");
					const externalUrl = str(n, "targetExternalUrl");
					const externalTitle = str(n, "targetExternalTitle");

					let href = targetPage ? buildNodeUrl(targetPage) : "";
					let title = targetPage ? targetPage.getDisplayableName() || targetPage.getName() : "";

					if (externalUrl && externalTitle) {
						href = externalUrl;
						title = externalTitle;
					}

					return { title, description: str(n, "description"), href };
				})
				.filter(({ title, href }) => title !== "" && href !== "")
		: [];

	// FAQ suggestions deep-link into the results page with `?question=<slug>`, mirroring the
	// `searchFaqSuggestion` authoring view. Entries missing a title or a slug are dropped there
	// too — keep both sides aligned so an editor never sees a suggestion in edit mode that the
	// live panel silently omits.
	const faqResults: SearchResult[] = searchBlockTarget
		? getChildNodesByType(searchBlockTarget, "spnt:searchFaqSuggestion")
				.map((n) => ({
					title: str(n, "questionTitle"),
					description: str(n, "questionDescription"),
					slug: str(n, "questionslug"),
				}))
				.filter(({ title, slug }) => title !== "" && slug !== "")
				.map(({ title, description, slug }) => ({
					title,
					description,
					href: withQuery("question", slug),
				}))
		: [];

	const results: SearchResult[] = [...linkResults, ...faqResults];

	return {
		action,
		placeholder: "Rechercher",
		allResultsLabel: "Voir tous les résultats",
		allResultsHref: action,
		suggestions,
		results,
		searchEndpoint,
		minLetters,
		maxSuggestions,
	};
}
