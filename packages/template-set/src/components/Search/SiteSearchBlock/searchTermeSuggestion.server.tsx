import { jahiaComponent } from "@jahia/javascript-modules-library";
import { getAncestorUrl, str } from "#lib/jcr";
import classes from "./component.module.css";

/**
 * `searchTermeSuggestion` view for `spnt:searchTermeSuggestion`.
 *
 * Port of the legacy JSP: build `${baseurl}?query=${term}` and render a link, only when
 * the term, its display title and the base url are all present. `baseurl` is the parent
 * page URL (passed as a template param in the JSP, resolved here via `getAncestorUrl`).
 */
jahiaComponent(
	{
		componentType: "view",
		nodeType: "spnt:searchTermeSuggestion",
		name: "searchTermeSuggestion",
		displayName: "Search Term Suggestion",
	},
	(_, { currentNode }) => {
		const term = str(currentNode, "term");
		const termDisplayTitle = str(currentNode, "termDisplayTitle");
		const baseUrl = getAncestorUrl(currentNode, "jnt:page");

		if (!term || !termDisplayTitle || !baseUrl) return null;

		const finalUrl = `${baseUrl}?query=${encodeURIComponent(term)}`;

		return (
			<p>
				<span className={classes["edit-suggestions__property-name"]}>Terme</span>
				{" → "}
				<a href={finalUrl}>{termDisplayTitle}</a>
			</p>
		);
	},
);
