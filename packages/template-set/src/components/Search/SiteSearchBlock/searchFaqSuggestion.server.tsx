import { jahiaComponent } from "@jahia/javascript-modules-library";
import { getAncestorUrl, str } from "#lib/jcr";
import classes from "./component.module.css";

/**
 * `searchFaqSuggestion` view for `spnt:searchFaqSuggestion`.
 *
 * Port of the legacy JSP: build `${baseurl}?question=${questionslug}` and render a link
 * (plus an optional description), only when the base url, slug and title are all present.
 * `baseurl` is the parent page URL (passed as a template param in the JSP, resolved here
 * via `getAncestorUrl`).
 */
jahiaComponent(
	{
		componentType: "view",
		nodeType: "spnt:searchFaqSuggestion",
		name: "searchFaqSuggestion",
		displayName: "Search FAQ Suggestion",
	},
	(_, { currentNode }) => {
		const questionTitle = str(currentNode, "questionTitle");
		const questionslug = str(currentNode, "questionslug");
		const questionDescription = str(currentNode, "questionDescription");
		const baseUrl = getAncestorUrl(currentNode, "jnt:page");

		if (!baseUrl || !questionslug || !questionTitle) return null;

		return (
			<p>
				<span className={classes["edit-suggestions__property-name"]}>Question</span>
				{" → "}
				<a href={`${baseUrl}?question=${encodeURIComponent(questionslug)}`}>{questionTitle}</a>
				{questionDescription && (
					<>
						{" "}
						- <span className={classes["edit-suggestions__property-name"]}>Description</span>
						{" → "}
						{questionDescription}
					</>
				)}
			</p>
		);
	},
);
