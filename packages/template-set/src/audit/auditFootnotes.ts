/*
 * CONTRÔLE DES MENTIONS LÉGALES — ANALYSE.
 *
 * Confronte ce que le rendu a produit — relevé par `#lib/footnoteCollector` — à ce que la
 * page contient réellement. Fonction PURE : ni DOM, ni rendu, ni état.
 *
 * Vit dans `src/audit/` et non dans `lib` : c'est de l'outillage contributeur, actif au seul
 * mode édition. `lib` enregistre, `audit` interprète — et la dépendance ne va que dans ce
 * sens-là.
 */
import type { FootnoteCollection, FootnoteLocation } from "#lib/footnoteCollector";

export type FootnoteIssueKind = "orphan" | "invalid" | "unused";

export interface FootnoteIssue {
	kind: FootnoteIssueKind;
	key: string;
	/** Composant et propriété où corriger, quand ils sont connus. */
	location: FootnoteLocation | null;
}

/**
 * Type de nœud dont les mentions ne sont jamais signalées « jamais citées ». Le pied de page
 * est rendu à l'identique sur TOUTES les pages : une mention qui y figure sans être appelée
 * dans la page en cours est le cas normal, pas une anomalie. La signaler produirait le même
 * avertissement partout et noierait les vraies alertes.
 */
const SITE_WIDE_SOURCES = ["sofnt:footer"];

/**
 * Confronte les renvois aux mentions. Les anomalies bloquantes d'abord, l'avertissement
 * ensuite — c'est l'ordre dans lequel le contributeur doit les traiter.
 */
export const auditFootnotes = ({ references, notes }: FootnoteCollection): FootnoteIssue[] => {
	const known = new Set(notes.map((note) => note.key));
	const cited = new Set(references.map((reference) => reference.key));
	const issues: FootnoteIssue[] = [];

	for (const reference of references) {
		// Une clé non numérique n'a pas de forme exposant : le jeton reste affiché en clair
		// aux visiteurs, ce qui est un défaut à part entière.
		const { key, location } = reference;
		if (!/^[0-9]+$/.test(key)) {
			issues.push({ kind: "invalid", key, location });
		} else if (!known.has(key)) {
			issues.push({ kind: "orphan", key, location });
		}
	}

	for (const note of notes) {
		if (cited.has(note.key) || SITE_WIDE_SOURCES.includes(note.source)) continue;
		issues.push({ kind: "unused", key: note.key, location: null });
	}

	return issues;
};

/** Énoncé affiché, dans les termes du contributeur : il écrit `((70))` et lit « (70) ». */
export const footnoteIssueMessage = ({ kind, key }: FootnoteIssue): string => {
	if (kind === "invalid") return `Le repère ((${key})) n'est pas valide`;
	return kind === "orphan"
		? `La mention (${key}) n'existe pas`
		: `La mention (${key}) n'est citée nulle part`;
};
