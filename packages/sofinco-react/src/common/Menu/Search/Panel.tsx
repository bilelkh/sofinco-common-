import styles from "./Search.module.css";

import Cta from "@shared/ui/Cta/Cta";
import Suggest from "./Suggest";
import Results from "./Results";
import { type SearchSuggestion, type SearchResult } from "./Search.type";

interface PanelProps {
  suggestions: SearchSuggestion[];
  effectiveResults: SearchResult[];
  allResultsLabel: string;
  submitHref: string;
  isOpen: boolean;
  fireSearch: (term: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  role: "dialog" | "region";
}

const Panel = ({
  suggestions,
  effectiveResults,
  allResultsLabel,
  submitHref,
  fireSearch,
  inputRef,
  isOpen,
  role,
}: PanelProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={styles["search__panel"]}
      role={role}
      aria-label="Suggestions de recherche"
    >
      <Suggest suggestions={suggestions} />

      {suggestions.length > 0 && effectiveResults.length > 0 && (
        <hr className={styles["search__divider"]} />
      )}

      <Results results={effectiveResults} />

      <div className={styles["search__cta-wrap"]}>
        <Cta
          label={allResultsLabel}
          variant="accent"
          href={submitHref}
          ctaSection="search-panel-all-results-cta"
          props={{
            onClick: () => fireSearch(inputRef.current?.value ?? ""),
          }}
        />
      </div>
    </div>
  );
};

export default Panel;
