import { manageFooterNote, normalizeFootnoteRef, type FootnoteLabels } from "#lib/footnotes";

/**
 * Numéro de note tel que le rendu l'utilisera, ou chaîne vide quand l'ancre n'en désigne
 * aucune.
 *
 * DÉLÈGUE à `normalizeFootnoteRef` (#lib/footnotes) — la MÊME normalisation que
 * `footnoteKey`, qui décide en aval si un id est réellement émis. Recopier ce nettoyage
 * ici l'a fait diverger une fois : une ancre `&nbsp;` ou `<b></b>` passait ce garde puis
 * produisait `<sup>(&nbsp;)</sup>` sans cible d'atterrissage. Les deux fonctions doivent
 * répondre « y a-t-il une note ? » de façon identique, sur toutes les entrées.
 *
 * LA CHAÎNE VIDE EST UN CAS MÉTIER, PAS UNE ERREUR : c'est le « texte sans renvoi ». Et
 * elle ne se réduit pas au champ vide — un contributeur qui saisit `()`, `(())` ou une
 * suite d'espaces croit poser une ancre alors qu'il n'en reste rien après nettoyage. Le
 * test doit donc porter sur le RÉSULTAT de la normalisation, jamais sur la valeur brute,
 * sous peine de rendre `<sup>()</sup>` — exactement les parenthèses vides remontées en
 * recette.
 */
export const footnoteNumber = (anchor: string): string => normalizeFootnoteRef(anchor);

/**
 * Builds the note HTML for a legal item from its optional `anchor` and rich-text `content`.
 * The anchor (entered as `n` or `(n)`) is rendered as a leading `<sup>(n)</sup>` inside the
 * first paragraph, so the result obeys the strict footer-note shape `<p><sup>(n)</sup>…</p>`
 * that `manageFooterNote` turns into `<p id="footerN">…↩</p>` — lining the note up with the
 * `#footerN` markers generated elsewhere.
 *
 * Sans ancre, le paragraphe est un TEXTE LIBRE : ni exposant, ni id d'atterrissage, ni
 * flèche de retour. Il traverse quand même `manageFooterNote`, car un texte libre peut
 * lui-même CITER une note (`<u>…<sup>(2)</sup></u>`) : on désactive l'ancrage, pas le lien
 * sortant.
 *
 * Shared by the live mapping (MentionLegal/default.server.tsx) and the edit-mode preview
 * (MentionLegalItem/default.server.tsx) so both show the same processed output. `content`
 * must be read RAW (sofnt:mentionLegalItem.content is kept out of FOOTNOTE_FIELDS) to avoid
 * double-processing.
 */
/**
 * Éléments de bloc qui ne peuvent PAS vivre dans un `<p>`.
 *
 * La toolbar `Simple` propose listes et citations : une mention peut donc légitimement
 * commencer par un `<ul>` ou un `<blockquote>`.
 */
const LEADING_BLOCK = /^\s*<(ul|ol|div|table|h[1-6]|blockquote|section|article|figure|pre)\b/i;

export const buildNote = (anchor: string, content: string, labels: FootnoteLabels): string => {
	const number = footnoteNumber(anchor);

	/*
	 * Texte sans renvoi. On rend le contenu TEL QUEL : l'emballer dans un `<p>` casserait un
	 * contenu qui commence par un bloc (cf. LEADING_BLOCK), et il n'y a de toute façon plus
	 * de marqueur à y loger.
	 */
	if (!number) return manageFooterNote(content, labels);

	const sup = `<sup>(${number})</sup>`;

	let withSup: string;
	if (/^\s*<p[^>]*>/i.test(content)) {
		// Cas courant : on injecte le marqueur dans le premier paragraphe.
		withSup = content.replace(/^(\s*<p[^>]*>)/i, `$1${sup} `);
	} else if (LEADING_BLOCK.test(content)) {
		/*
		 * Le contenu commence par un bloc. L'envelopper dans un `<p>` produirait du HTML
		 * INVALIDE — `<p><sup>(1)</sup> <ul>…</ul></p>` — que le navigateur corrige en
		 * refermant le `<p>` avant la liste. Le DOM construit diffère alors du HTML envoyé
		 * par le serveur, et toute hydratation React dans ce sous-arbre échoue sur
		 * l'erreur #418.
		 *
		 * On donne donc au marqueur son propre paragraphe, placé avant le bloc.
		 * `addIdToParagraph` y accroche l'id d'atterrissage et la flèche ↩ exactement
		 * comme dans les autres cas.
		 */
		withSup = `<p>${sup}</p>${content}`;
	} else {
		// Texte brut ou HTML inline : le paragraphe est légitime.
		withSup = `<p>${sup} ${content}</p>`;
	}

	return manageFooterNote(withSup, labels);
};
