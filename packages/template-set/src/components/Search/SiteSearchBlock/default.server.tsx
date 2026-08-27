import { Island, jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import { toArray } from "#lib/javaBridge";
import { isEditMode } from "#lib/renderContext";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import SiteSearchBlock from "./SiteSearchBlock.client";
import classes from "./component.module.css";
import type {
	DisplaySearchResult,
	Hit,
	JavaDisplaySearchResult,
	JavaHit,
	JavaSearchBean,
	Props,
	SiteSearchBlockProps,
} from "./siteSearchBlock.type";

const PAGE_SIZE = 10;

jahiaComponent(
	{
		componentType: "view",
		nodeType: "spnt:siteSearchBlock",
		properties: {
			"cache.requestParameters": "query,page",
		},
	},
	({ title }: Props, { renderContext }) => {
		const searchBean = renderContext.getRequest().getAttribute("searchBean") as
			| JavaSearchBean
			| null
			| undefined;

		const siteSearch: SiteSearchBlockProps = {
			data: {
				results: toArray<JavaHit>(searchBean?.getResults()).map(
					(hit): Hit => ({
						title: hit.getTitle(),
						link: hit.getLink(),
						excerpt: hit.getExcerpt(),
						type: hit.getType(),
						path: hit.getPath(),
						score: hit.getScore(),
					}),
				),
				step: Number(searchBean?.getStep() ?? 0),
				order: searchBean?.getOrder() ?? "",
				searchValue: searchBean?.getSearchValue() ?? "",
				nbResults: Number(searchBean?.getNbResults() ?? 0),
				suggestion: searchBean?.getSuggestion() ?? "",
				smartNbResults: Number(searchBean?.getSmartNbResults() ?? 0),
				smartResults: toArray<JavaDisplaySearchResult>(searchBean?.getSmartResults()).map(
					(item): DisplaySearchResult => ({
						title: item.getTitle(),
						slug: item.getSlug(),
						description: item.getDescription(),
						canonicalurl: item.getCanonicalurl(),
					}),
				),
			},
		};

		const req = renderContext.getRequest();
		const action = String(req.getRequestURI() ?? "");
		const pageParam = Number(req.getParameter("page") ?? 1);
		const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
		const totalPages = Math.max(1, Math.ceil(siteSearch.data.nbResults / PAGE_SIZE) || 1);

		return (
			<>
				<Island
					component={SiteSearchBlock}
					props={{
						title: title ?? "Que recherchez-vous ?",
						action,
						initialQuery: siteSearch.data.searchValue,
						results: siteSearch.data.results,
						smartResults: siteSearch.data.smartResults,
						nbResults: siteSearch.data.nbResults,
						smartNbResults: siteSearch.data.smartNbResults,
						currentPage,
						totalPages,
					}}
				/>
				{/* Edit mode: expose the suggestion children below the rendered block so
				    editors can visualise the SearchBlock and still add/edit suggestions. */}
				{isEditMode(renderContext) && (
					<>
						<div className={classes["edit-suggestions"]}>
							<p className={classes["edit-suggestions__title"]}>Suggestions de recherche</p>
							<RenderChildren
								view="searchSuggestion"
								nodeTypes={["spnt:searchSuggestion"]}
								filter={(n: JCRNodeWrapper) => n.isNodeType("spnt:searchSuggestion")}
							/>
						</div>
						<div className={classes["edit-suggestions"]}>
							<p className={classes["edit-suggestions__title"]}>Suggestions de termes</p>
							<RenderChildren
								view="searchTermeSuggestion"
								nodeTypes={["spnt:searchTermeSuggestion"]}
								filter={(n: JCRNodeWrapper) => n.isNodeType("spnt:searchTermeSuggestion")}
							/>
						</div>
						<div className={classes["edit-suggestions"]}>
							<p className={classes["edit-suggestions__title"]}>Suggestions FAQ</p>
							<RenderChildren
								view="searchFaqSuggestion"
								nodeTypes={["spnt:searchFaqSuggestion"]}
								filter={(n: JCRNodeWrapper) => n.isNodeType("spnt:searchFaqSuggestion")}
							/>
						</div>
					</>
				)}
			</>
		);
	},
);
