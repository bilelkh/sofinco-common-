// Plain JS DTOs — used for Island props, JSON output, etc.

export interface Hit {
  title?: string;
  link?: string;
  excerpt?: string;
  type?: string;
  path?: string;
  score?: number;
}

export interface DisplaySearchResult {
  title?: string;
  slug?: string;
  description?: string;
  canonicalurl?: string;
}

export interface SearchBean {
  results: Hit[];
  step: number;
  order: string;
  searchValue: string;
  nbResults: number;
  suggestion: string;
  smartNbResults: number;
  smartResults: DisplaySearchResult[];
}

export interface SiteSearchBlockProps {
  data: SearchBean;
}

export interface Props {
  title: string;
}

// Java host objects as seen from Jahia's GraalVM JS runtime.
// Getters are callable methods (NOT auto-resolved JS properties).
// Java Lists are exposed as array-like (length + index), not as JavaList APIs,
// so getters that return Java collections are typed as `unknown` and converted
// in the consumer via a length+index toArray helper.

export interface JavaHit {
  getTitle(): string;
  getLink(): string;
  getExcerpt(): string;
  getType(): string;
  getPath(): string;
  getScore(): number;
}

export interface JavaDisplaySearchResult {
  getTitle(): string;
  getSlug(): string;
  getDescription(): string;
  getCanonicalurl(): string;
}

export interface JavaSearchBean {
  getResults(): unknown;
  getStep(): number;
  getOrder(): string;
  getSearchValue(): string;
  getNbResults(): number;
  getSuggestion(): string;
  getSmartNbResults(): number;
  getSmartResults(): unknown;
}
