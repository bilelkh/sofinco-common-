export type SearchSuggestion = {
  label: string;
  termDisplayTitle: string;
};

export type SearchResult = {
  title: string;
  description: string;
  href: string;
};

export type SearchProps = {
  /** Form `action` URL — where the GET search query is submitted. */
  action: string;
  /** Input placeholder + accessible label. */
  placeholder?: string;
  /** Label of the "see all results" CTA at the bottom of the panel. */
  allResultsLabel?: string;
  /** Href of the "see all results" CTA. Falls back to `action`. */
  allResultsHref?: string;
  /** Quick search-term suggestions shown in the dropdown. */
  suggestions?: SearchSuggestion[];
  /** Pre-computed result entries shown in the dropdown (fallback when no live query). */
  results?: SearchResult[];
  /**
   * URL of the `spnt:siteSearchBlock` JSON view (e.g. `<node>.json`). When set, the
   * panel fetches live results from it as the user types. Omit to keep static results.
   */
  searchEndpoint?: string;
  /** Minimum number of typed letters before firing a live suggestion request. */
  minLetters?: number;
  /** Max number of live results requested (passed as the `limit` query param). */
  maxSuggestions?: number;
  className?: string;
  width?: number;
};
