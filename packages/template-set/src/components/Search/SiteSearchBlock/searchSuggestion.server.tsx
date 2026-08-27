import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import { getPropertyAsNode, str } from "#lib/jcr";
import classes from "./component.module.css";

/**
 * `searchSuggestion` view for `spnt:searchSuggestion`.
 *
 * Port of the legacy JSP: resolve a target (internal page reference first, then an
 * external url/title pair which overrides it) and render a link + description only when
 * both a url and a title are available.
 */
jahiaComponent(
	{
		componentType: "view",
		nodeType: "spnt:searchSuggestion",
		name: "searchSuggestion",
		displayName: "Search Suggestion",
	},
	(_, { currentNode }) => {
		const description = str(currentNode, "description");

		let targetUrl = "";
		let targetTitle = "";

		const targetPage = getPropertyAsNode(currentNode, "targetPage");
		if (targetPage) {
			targetUrl = buildNodeUrl(targetPage);
			// Same fallback as the header mapper: a page with no title in the rendered locale
			// would otherwise produce a link with no text at all.
			targetTitle = targetPage.getDisplayableName() || targetPage.getName();
		}

		const targetExternalUrl = str(currentNode, "targetExternalUrl");
		const targetExternalTitle = str(currentNode, "targetExternalTitle");
		if (targetExternalUrl && targetExternalTitle) {
			targetUrl = targetExternalUrl;
			targetTitle = targetExternalTitle;
		}

		if (!targetUrl || !targetTitle) return null;

		return (
			<p>
				<span className={classes["edit-suggestions__property-name"]}>Page</span>
				{" → "}
				<a href={targetUrl}>{targetTitle}</a> -{" "}
				<span className={classes["edit-suggestions__property-name"]}>Description</span>
				{" → "}
				{description}
			</p>
		);
	},
);
