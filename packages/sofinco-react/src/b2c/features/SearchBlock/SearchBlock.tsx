/*
 * PAGE DE RECHERCHE — aucun renvoi de note ici, et ce n'est pas qu'une question d'utilité.
 *
 * Cette page ne porte AUCUNE mention légale : vérifié sur le site en production
 * (sofinco.fr/recherche). Or les titres et descriptions affichés ici viennent d'AUTRES
 * pages. Un renvoi rendu par `FootnoteText` y produisait donc :
 *   - un `<a href="#footerN">` vers une note absente du document — un lien mort ;
 *   - un `aria-describedby` pointant sur un identifiant inexistant — une référence ARIA
 *     pendante, que les lecteurs d'écran ignorent silencieusement.
 *
 * Le titre du bloc, lui, est un libellé de service (« Résultats de recherche »), pas une
 * allégation commerciale. Le marqueur reste visible sous sa forme texte `⁽³⁾`, produite
 * par `str()` côté serveur : le lecteur voit le renvoi, on ne fabrique simplement pas un
 * lien qui ne mène nulle part.
 */
/* eslint-disable sofinco/require-footnote-text -- page sans mention légale : toute ancre y serait morte */
import { useRef, useState } from "react";
import ChevronRight from "@shared/ui/svg/chevron-right";
import classes from "./SearchBlock.module.css";
import type { SearchBlockProps } from "./SearchBlock.type";

type Tab = "results" | "smartResults";

const SearchBlock = ({
	title,
	action,
	initialQuery,
	results,
	smartResults,
	nbResults,
	smartNbResults,
	currentPage,
	totalPages,
}: SearchBlockProps) => {
	const [query, setQuery] = useState(initialQuery || "");
	const [activeTab, setActiveTab] = useState<Tab>("results");
	const inputRef = useRef<HTMLInputElement>(null);
	const lastInitialQueryRef = useRef(initialQuery);
	if (lastInitialQueryRef.current !== initialQuery) {
		lastInitialQueryRef.current = initialQuery;
		setQuery(initialQuery);
	}

	const handleClear = () => {
		setQuery("");
		inputRef.current?.focus();
	};

	const switchTab = (tab: Tab, e: React.MouseEvent) => {
		e.preventDefault();
		setActiveTab(tab);
	};

	const buildPageUrl = (page: number) => {
		const params = new URLSearchParams();
		if (query) params.set("query", query);
		params.set("page", String(page));
		return `${action}?${params.toString()}`;
	};

	const renderPagination = () => {
		if (totalPages <= 1) return null;
		const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

		return (
			<nav className={classes.pagination} aria-label="Pagination">
				{currentPage > 1 ? (
					<a
						className={classes.chevron}
						href={buildPageUrl(currentPage - 1)}
						aria-label="Page précédente"
					>
						<span className={classes.chevronPrev}>
							<ChevronRight />
						</span>
					</a>
				) : (
					<button type="button" className={classes.chevron} disabled aria-label="Page précédente">
						<span className={classes.chevronPrev}>
							<ChevronRight />
						</span>
					</button>
				)}

				<div className={classes.pageNumbers}>
					{pages.map((p) => (
						<a
							key={p}
							className={`${classes.pageBtn} ${currentPage === p ? classes.pageBtnActive : ""}`}
							href={buildPageUrl(p)}
							aria-current={currentPage === p ? "page" : undefined}
						>
							{p}
						</a>
					))}
				</div>

				{currentPage < totalPages ? (
					<a
						className={classes.chevron}
						href={buildPageUrl(currentPage + 1)}
						aria-label="Page suivante"
					>
						<ChevronRight />
					</a>
				) : (
					<button type="button" className={classes.chevron} disabled aria-label="Page suivante">
						<ChevronRight />
					</button>
				)}
			</nav>
		);
	};

	return (
		<section className={classes.wrapper}>
			<h2 className={classes.title}>{title}</h2>

			<form method="get" action={action} className={classes.formWrapper}>
				<div className={classes.inputContainer}>
					<svg
						className={classes.searchIcon}
						width={18}
						height={18}
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth={1.5}
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<circle cx={11} cy={11} r={8} />
						<path d="m21 21-4.3-4.3" />
					</svg>

					<input
						ref={inputRef}
						type="text"
						name="query"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Rechercher"
						className={classes.input}
						autoComplete="off"
						aria-label="Rechercher"
					/>

					{query && (
						<button
							type="button"
							className={classes.clearButton}
							onClick={handleClear}
							aria-label="Effacer la recherche"
						>
							<svg
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth={1.5}
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M18 6 6 18" />
								<path d="m6 6 12 12" />
							</svg>
						</button>
					)}

					<button type="submit" className={classes.hiddenSubmit} tabIndex={-1}>
						Rechercher
					</button>
				</div>
			</form>

			<div className={classes.summary}>
				Nous avons trouvé{" "}
				<a href="#results" className={classes.summaryLink} onClick={(e) => switchTab("results", e)}>
					{nbResults} offres &amp; actualités
				</a>{" "}
				et{" "}
				<a
					href="#smartResults"
					className={classes.summaryLink}
					onClick={(e) => switchTab("smartResults", e)}
				>
					{smartNbResults} questions &amp; réponses
				</a>{" "}
				pour : &laquo;&nbsp;{initialQuery}&nbsp;&raquo;
			</div>

			<div className={classes.tabsContainer}>
				<div className={classes.tabsList} role="tablist">
					<button
						role="tab"
						aria-selected={activeTab === "results"}
						className={`${classes.tab} ${activeTab === "results" ? classes.tabActive : ""}`}
						onClick={(e) => switchTab("results", e)}
					>
						Nos offres &amp; actualités ({nbResults} résultats)
					</button>
					<button
						role="tab"
						aria-selected={activeTab === "smartResults"}
						className={`${classes.tab} ${activeTab === "smartResults" ? classes.tabActive : ""}`}
						onClick={(e) => switchTab("smartResults", e)}
					>
						Questions &amp; réponses ({smartNbResults} résultats)
					</button>
				</div>
			</div>

			<div className={classes.resultsList}>
				{activeTab === "results"
					? results.map((hit) => (
							<article key={`${hit.link ?? ""}-${hit.title ?? ""}`} className={classes.resultItem}>
								<h3 className={classes.resultTitle}>
									<a href={hit.link}>{hit.title}</a>
								</h3>
								{hit.excerpt && <p className={classes.resultDesc}>{hit.excerpt}</p>}
							</article>
						))
					: smartResults.map((result) => (
							<article
								key={`${result.canonicalurl ?? ""}-${result.title ?? ""}`}
								className={classes.resultItem}
							>
								<h3 className={classes.resultTitle}>
									<a href={result.canonicalurl}>{result.title}</a>
								</h3>
								{result.description && <p className={classes.resultDesc}>{result.description}</p>}
							</article>
						))}
			</div>

			<div className={classes.paginationWrapper}>{renderPagination()}</div>
		</section>
	);
};

export default SearchBlock;
