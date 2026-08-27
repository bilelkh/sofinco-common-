import { jahiaComponent } from "@jahia/javascript-modules-library";
import { toArray } from "#lib/javaBridge";
import type { JavaDisplaySearchResult, JavaHit, JavaSearchBean } from "./siteSearchBlock.type";

/**
 * Header live-suggestions endpoint for `spnt:siteSearchBlock`.
 *
 * This is an HTML view (named `suggest`) that emits JSON, NOT a json-template view.
 * Why: Jahia refuses to render a content node standalone in live (its plain `.json` /
 * `.html` URLs return the 404 error page), and the `.ajax` render mode — which DOES
 * bypass that wall — only works for the `html` template type, never `json`. So the menu
 * Search fetches `<node>.suggest.html.ajax?query=…`, which:
 *   1. is allowed by `.ajax`,
 *   2. triggers `SearchFilter` (portal-common-sofinco, applyOnTemplateTypes "html"),
 *      which populates the `searchBean` request attribute WITH the node — so we get both
 *      the Jahia full-text hits AND the SmartTribune `smartResults`,
 *   3. renders this view, which serializes that bean to JSON.
 *
 * The body is `text/html` but contains pure JSON — the client does `JSON.parse` on it.
 */

interface Props {
	maxSuggestionsForheader?: number;
}

jahiaComponent(
	{
		componentType: "view",
		nodeType: "spnt:siteSearchBlock",
		name: "suggest",
		properties: {
			"cache.requestParameters": "query,page,limit",
		},
	},
	({ maxSuggestionsForheader }: Props, { renderContext }) => {
		const searchBean = renderContext.getRequest().getAttribute("searchBean") as
			| JavaSearchBean
			| null
			| undefined;

		const max = Number(maxSuggestionsForheader ?? 5) || 5;

		const results = [
			...toArray<JavaHit>(searchBean?.getResults()).map((hit) => ({
				title: hit.getTitle(),
				description: hit.getExcerpt(),
				href: hit.getLink(),
			})),
			...toArray<JavaDisplaySearchResult>(searchBean?.getSmartResults()).map((item) => ({
				title: item.getTitle(),
				description: item.getDescription(),
				href: item.getCanonicalurl(),
			})),
		].slice(0, max);

		// Plain DTO only — never JSON.stringify the raw Java bean.
		return <>{JSON.stringify({ results, suggestion: searchBean?.getSuggestion() ?? "" })}</>;
	},
);
