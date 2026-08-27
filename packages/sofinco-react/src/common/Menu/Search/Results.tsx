/*
 * NAVIGATION — aucun renvoi de note dans ce fichier.
 *
 * Un renvoi de note se rattache à une allégation commerciale : un taux, une durée, une
 * condition. Les libellés de ce fichier sont des DESTINATIONS, pas des allégations — un
 * marqueur y serait une erreur de contribution, pas un cas d'usage. Enveloppés, ils ne
 * produisaient de toute façon aucun lien : imbriqué dans un <a>, `FootnoteText` ne rend
 * que la marque, en `aria-hidden`.
 *
 * Les surfaces PROMOTIONNELLES du menu, elles, restent enveloppées : voir
 * `Desktop/components/Card/Card.tsx`, qui porte une offre et son CTA.
 */
/* eslint-disable sofinco/require-footnote-text -- libellés de navigation, jamais des allégations */
import { type SearchResult } from "./Search.type";

import Link from "@shared/ui/Link/Link";
import styles from "./Search.module.css";

const Results = ({ results }: { results: SearchResult[] }) => {
	if (results.length > 0) {
		return (
			<ul className={styles["search__results"]}>
				{results.map((r) => (
					<li key={r.href + r.title} className={styles["search__result-item"]}>
						<Link href={r.href} label={r.title} className={styles["search__result-title"]} />
						<p className={styles["search__result-desc"]}>{r.description}</p>
					</li>
				))}
			</ul>
		);
	}

	return null;
};

export default Results;
