import styles from "./Search.module.css";
import { type SearchSuggestion } from "./Search.type";
import Link from "@shared/ui/Link/Link";

const Suggest = ({ suggestions }: { suggestions: SearchSuggestion[] }) => {
  if (suggestions.length > 0) {
    return (
      <>
        <h3 className={styles["search__heading"]}>Suggestions de recherche</h3>
        <ul className={styles["search__suggestions"]}>
          {suggestions.map((s) => (
            <li key={s.termDisplayTitle + s.label}>
              <Link
                href={s.termDisplayTitle}
                label={s.label}
                className={styles["search__suggestion-link"]}
                tracking={{ event: "search_event", search_term: s.label }}
              />
            </li>
          ))}
        </ul>
      </>
    );
  }
  return null;
};

export default Suggest;
