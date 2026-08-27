// Server-side port of the legacy `manageFooterNote` taglib (from the external
// `portal-common-sofinco` module). Pure string functions — no DOM, GraalVM-safe —
// so they can run during SSR before the value reaches a React component / Island.
//
// Two passes over a rich-text HTML string:
//   1. addFooterNote     — `<u>…<sup>(n)</sup>…</u>` markers → forward links
//   2. addIdToParagraph  — `<p><sup>(n)</sup>…</p>` notes → landing id + back link
//
// `filterHtmlId` makes the superscript content safe to use as an id, and is used by
// BOTH passes with the same input, which is what guarantees the forward link and the
// target id line up.

import {
	collectFootnoteNote,
	collectFootnoteReference,
	isCollectingFootnotes,
} from "./footnoteCollector";

export interface FootnoteLabels {
	/** Screen-reader label appended to the marker link (a11y.noteBasDePage). */
	note: string;
	/** aria-label of the "↩" back link (a11y.retourRef). */
	back: string;
}

/**
 * Makes arbitrary text safe to use as an HTML id: keeps letters/digits/`-`/`.`/`:`,
 * and encodes every other UTF-16 code unit as `U%04X` (e.g. a space → `U0020`).
 *
 * NOTE: `Character.isLetterOrDigit` is Unicode-aware in the Java original; here we
 * approximate it with the ASCII range, which is sufficient because footnote markers
 * are numeric superscripts (e.g. `(1)` → `U00281U0029`). Determinism — same input
 * yields the same id in both passes — is what matters.
 */
export const filterHtmlId = (input: string): string => {
	if (!input) return input;
	const trimmed = input.trim();
	let result = "";
	for (let i = 0; i < trimmed.length; i++) {
		const ch = trimmed[i];
		if (/[A-Za-z0-9]/.test(ch) || ch === "-" || ch === "." || ch === ":") {
			result += ch;
		} else {
			result += "U" + trimmed.charCodeAt(i).toString(16).toUpperCase().padStart(4, "0");
		}
	}
	return result;
};

/**
 * Builds the id key shared by a marker and its note. The superscript text is normalized
 * first so the same footnote lines up whether the author wrote the reference as `n` or
 * `(n)` — real content mixes `<sup>1</sup>` markers with `<sup>(1)</sup>` notes. We strip
 * any inline tags, decode `&nbsp;`, and remove surrounding parentheses, then reuse
 * `filterHtmlId` on what remains — so `1` and `(1)` both yield `footer1`, while a symbol
 * marker like `*` still round-trips deterministically.
 */
/**
 * Normalisation partagée d'un renvoi — LA définition, et la seule.
 *
 * Retire les balises, décode `&nbsp;`, puis les parenthèses englobantes : `1`, `(1)`,
 * `<b>(1)</b>` et `&nbsp;(1)&nbsp;` désignent tous la note 1, et `&nbsp;`, `<b></b>` ou
 * `()` ne désignent AUCUNE note.
 *
 * EXPORTÉE PARCE QUE DEUX APPELANTS EN DÉPENDENT, et qu'ils ont déjà divergé une fois.
 * `footnoteKey` s'en sert pour produire l'identifiant ; `footnoteNumber`
 * (MentionLegal/buildNote.ts) s'en sert pour décider s'il y a une note à ancrer. Quand
 * cette dernière recopiait le nettoyage en le simplifiant, une ancre `&nbsp;` passait son
 * garde puis produisait `<sup>(&nbsp;)</sup>` sans cible : un exposant vide, exactement le
 * défaut que le garde existait pour empêcher.
 *
 * Toute règle de nettoyage ajoutée ici bénéficie donc aux deux, par construction.
 */
export const normalizeFootnoteRef = (raw: string): string =>
	(raw ?? "")
		.replace(/<[^>]*>/g, "")
		.replace(/&nbsp;/gi, " ")
		.trim()
		.replace(/^\(+|\)+$/g, "")
		.trim();

export const footnoteKey = (sup: string): string => filterHtmlId(normalizeFootnoteRef(sup));

/**
 * The forward-link marker, shared by every authoring syntax so they cannot drift.
 * `data-footer` is the hook for the smooth-scroll handler (`footnote-bootstrap.ts`).
 *
 * AUCUN `id` SUR LE MARQUEUR — et c'est délibéré.
 *
 * Une même note est appelée plusieurs fois dans une page ; sur une page réelle du site on
 * a relevé jusqu'à DIX renvois vers la note 2. Poser `id="footer2-ref"` sur chacun produit
 * dix éléments homonymes : l'unicité de `id` est normative en HTML, donc validation W3C et
 * revue RGAA en échec, et `getElementById` renvoie de toute façon le premier quel que soit
 * celui sur lequel le lecteur a cliqué.
 *
 * Une version antérieure ne le posait que sur le premier marqueur — mais le compteur
 * vivait dans `addFooterNote`, donc PAR CHAMP richtext : deux champs citant la note 1
 * dupliquaient l'identifiant malgré tout. L'invariant n'a jamais tenu à l'échelle de la
 * page, et il ne PEUT pas tenir côté React, où `FootnoteText` est une fonction pure qui
 * ignore ce que rendent les autres composants.
 *
 * Le retour se résout donc par `[data-footer]` : le script client mémorise le marqueur
 * réellement cliqué, et à défaut vise le premier en ordre document — exactement ce que
 * faisait l'identifiant dupliqué, mais sans HTML invalide.
 *
 * `inner` is already-safe HTML — the caller is responsible for escaping when it starts
 * from plain text.
 */
const buildMarkerLink = (footerId: string, inner: string, labels: FootnoteLabels): string =>
	`<a href="#${footerId}" data-footer="${footerId}" class="footer-link">` +
	inner +
	`<span class="sr-only">${labels.note}</span></a>`;

/**
 * Pass 1 — turn each `<u>…<sup>(n)</sup>…</u>` marker into a forward link to its note.
 */
const addFooterNote = (html: string, labels: FootnoteLabels): string =>
	// `<u[^>]*>` et non un `<u>` nu : tolère un marqueur portant un attribut, forme que
	// certains contenus ont pu prendre. L'id vient toujours du contenu du `<sup>`, donc
	// les deux formes résolvent vers la même ancre.
	html.replace(/<u[^>]*>(.*?)<sup>(.*?)<\/sup>(.*?)<\/u>/g, (match, before, sup, after) => {
		const key = footnoteKey(sup);
		// `<sup></sup>` ou `<sup>()</sup>` ne désigne aucune note : on laisserait `href="#footer"`,
		// un fragment mort, et on enregistrerait une clé vide que le contrôle signalerait comme
		// un repère invalide. Le souligné reste tel quel — c'est du texte, pas un renvoi.
		if (!key) return match;
		if (isCollectingFootnotes()) collectFootnoteReference(key);
		return buildMarkerLink("footer" + key, `${before}<sup>${sup}</sup>${after}`, labels);
	});

/**
 * Pass 2 — give a note paragraph (`<p><sup>(n)</sup>…</p>`) the matching landing id and
 * append a "↩" back link to the marker. `[\s\S]` stands in for Java's `(?s)` dotall flag.
 */
const addIdToParagraph = (html: string, labels: FootnoteLabels, source: string): string =>
	html.replace(/<p[^>]*>(<sup>([\s\S]*?)<\/sup>[\s\S]*?)(<\/p>)/g, (match, body, sup, closing) => {
		const key = footnoteKey(sup);
		// Pas de numéro, pas de note : poser `id="footer"` fabriquerait une cible anonyme —
		// dupliquée dès la deuxième occurrence dans la page — et déclarerait au contrôle une
		// mention de clé vide, aussitôt signalée « jamais citée ».
		if (!key) return match;
		if (isCollectingFootnotes()) collectFootnoteNote(key, source);
		const footerId = "footer" + key;
		/*
		 * UN BOUTON, PAS UN LIEN. Les marqueurs ne portent plus d'`id` (cf. `buildMarkerLink`),
		 * donc un `href="#footerN-ref"` ne désignerait plus rien : un fragment mort, que tout
		 * vérificateur de liens signale. Et le retour n'est de toute façon pas une
		 * destination — c'est une ACTION, dont la cible dépend du marqueur d'où vient le
		 * lecteur, information que seul le script client détient.
		 *
		 * Reste focalisable et actionnable au clavier, contrairement à un `<a>` sans `href`.
		 * Valide dans un `<p>` : un bouton est du contenu de phrasé. L'apparence est
		 * neutralisée dans `templates/global.css`, pour rester identique au `<a>` précédent.
		 */
		return (
			`<p id="${footerId}">` +
			body +
			`<button type="button" class="footer-back-link" data-footer="${footerId}" aria-label="${labels.back}">↩</button>` +
			closing
		);
	});

/**
 * Pass 0 — restore the canonical marker shape from CKEditor 5's serialization.
 *
 * ⚠️ FILET, PLUS UNE NÉCESSITÉ. Le projet est revenu à CKEditor 4, qui produit
 * `<u>texte<sup>(1)</sup></u>` nativement et stablement. Cette passe ne sert plus qu'au
 * contenu qui a transité par CK5 pendant la période où il était activé : sans elle, ces
 * renvois-là resteraient du texte souligné, définitivement. À conserver tant que ce
 * contenu n'a pas été réenregistré en CK4.
 *
 * CK5 does not store HTML: it stores a model (text + `underline`/`superscript`
 * attributes) and re-serializes on save in its own nesting order. Authoring the marker
 * exactly as the contributor guide describes (underline the text, then superscript the
 * number) produces `<u>taux fixe</u><sup><u>1</u></sup>` — the `<u>` closed *before* the
 * `<sup>`, and the `<sup>` sitting outside it. `addFooterNote` requires the `<sup>`
 * *inside* a single `<u>`, so it no longer matches and the marker silently stays plain
 * text. Verified against a live CK5 save.
 *
 * This matters beyond newly authored content: an existing `<u>x<sup>(1)</sup></u>` is
 * parsed into the same model and rewritten in the CK5 shape the first time its field is
 * re-saved. Without this pass, every legacy footnote breaks one field at a time, with no
 * error anywhere.
 *
 * LIMITATION — this repairs the one shape above. It deliberately does NOT chase every
 * combination CK5 can emit: adding a link around the number, for instance, yields
 * `<u>x </u><a href="#1"><sup><u>1</u></sup></a>`, which this leaves alone. Rescuing
 * those by string surgery is a losing race; the durable fix is to author the marker as a
 * dedicated CK5 element whose downcast is fixed, so no reconstruction is needed at all.
 * Treat this as a safety net for existing content, not as the supported authoring path.
 */
const normalizeCk5Marker = (html: string): string =>
	html.replace(/<\/u><sup><u>([\s\S]*?)<\/u><\/sup>/g, "<sup>$1</sup></u>");

/**
 * Renvois DÉJÀ RENDUS, pour le seul contrôle éditorial — ne transforme rien.
 *
 * Deux formes échappent aux passes de réécriture, et donc à la collecte :
 *
 *   1. `<a href="#footerN">…⁽ⁿ⁾</a>` — ce que le menu « Ancres de la page » de jContent
 *      insère (cf. `sofincoPageAnchors/plugin.js`). Le contributeur n'écrit PAS de jeton
 *      `((n))` : le plugin pose directement le lien et la forme exposant. C'est la forme
 *      dominante du richtext, et c'est elle qui faisait déclarer « jamais citées » des
 *      mentions pourtant utilisées — le défaut constaté sur `sofnt:seoBlock`.
 *   2. `⁽ⁿ⁾` seul, dans un texte déjà converti ou collé tel quel.
 *
 * Le lien fait foi quand il est là : il porte l'identifiant exact de la mention visée.
 */
/*
 * Le lien EST capturé avec son contenu, pas seulement son `href` — et c'est indispensable.
 *
 * Quand le contributeur efface le `⁽⁵⁰⁾` visible, CKEditor laisse presque toujours l'ancre
 * derrière lui : `<a href="#footer50"></a>`. Un motif portant sur le seul `href` continuait
 * de compter ce vestige comme un renvoi, et le contrôle signalait indéfiniment une anomalie
 * que le contributeur venait de corriger — défaut constaté sur `sofnt:seoBlock`.
 *
 * Une ancre VIDE n'est pas un renvoi. Une ancre qui porte encore du texte en est un, même
 * sans exposant : elle pointe toujours vers la mention, et si celle-ci n'existe pas c'est un
 * lien mort qu'il faut bel et bien signaler.
 */
const RENDERED_LINK = /<a\b[^>]*href="#footer([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
const RENDERED_SUPERSCRIPT = /⁽([⁰¹²³⁴⁵⁶⁷⁸⁹]{1,8})⁾/g;

const collectRenderedReferences = (html: string): void => {
	for (const [, key, inner] of html.matchAll(RENDERED_LINK)) {
		// Le retour ↩ vise `#footerN-ref` sur du contenu encore en cache : ce n'est pas un renvoi.
		if (key.slice(-4) === "-ref") continue;
		// Ancre vidée de son contenu : vestige d'une correction, plus un renvoi.
		if (
			!inner
				.replace(/<[^>]*>/g, "")
				.replace(/&nbsp;/gi, " ")
				.trim()
		)
			continue;
		collectFootnoteReference(key);
	}

	for (const [, digits] of html.matchAll(RENDERED_SUPERSCRIPT)) {
		let key = "";
		for (const char of digits) key += String(SUPERSCRIPT_DIGITS.indexOf(char));
		collectFootnoteReference(key);
	}
};

/**
 * Rewrites a rich-text HTML string so footnote markers and notes become linked,
 * accessible anchors. Apply on the server, before injecting the HTML.
 */
export const manageFooterNote = (html: string, labels: FootnoteLabels, source = ""): string => {
	// Les renvois déjà rendus (lien d'ancre, exposant) ne passent par aucune passe de
	// réécriture : sans ce relevé, le contrôle éditorial les ignorerait.
	if (isCollectingFootnotes()) collectRenderedReferences(html);
	return addIdToParagraph(addFooterNote(normalizeCk5Marker(html), labels), labels, source);
};

/* ------------------------------------------------------------------ *
 * Footnote references in PLAIN-TEXT fields (jcr:title, textarea, …)
 * ------------------------------------------------------------------ */

/**
 * The authoring token for a footnote reference in a plain-text field: `((1))`.
 *
 * Chosen over `[^1]` (Markdown), `[[1]]` or `#1` on keyboard grounds: parentheses are the
 * only delimiters directly reachable on a French AZERTY layout — `[`/`]` need AltGr and
 * `^` is a dead key. It also extends an existing habit, since contributors already write
 * `(1)` inside the notes themselves, and a doubled parenthesis never occurs in French
 * prose — unlike a single `(1)`, which is common in legal copy ("l'article (1) du code").
 *
 * `{{…}}` is deliberately avoided: taken by the simulator variables.
 *
 * Content is bounded and cannot contain parentheses, so the match is unambiguous.
 */
const FOOTNOTE_TOKEN = /\(\(\s*([^()]{1,32}?)\s*\)\)/g;

const SUPERSCRIPT_DIGITS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

/**
 * Renders `((n))` tokens as their Unicode superscript form: `((1))` → `⁽¹⁾`.
 *
 * TEXT IN, TEXT OUT — and that is the whole point. A footnote reference cannot be
 * server-rendered as markup without the consuming component opting into HTML, which in
 * React means touching every component (and, for hydrated `Island`s, its client
 * counterpart too, since props are serialized). Producing plain text sidesteps that
 * entirely: `str()` can apply it, so every mapping benefits with no component change.
 *
 * Consequences, all of them wanted:
 *   - the reference is in the SERVER-RENDERED HTML, so crawlers and social scrapers that
 *     never run JS see `⁽¹⁾`, not a raw `((1))`;
 *   - it is safe in attributes, `<title>`, meta tags, the jContent tree label and the
 *     search index, because it is still just text;
 *   - hydration-safe: the same string is serialized to the client, so an Island re-renders
 *     identically and React has nothing to reconcile.
 *
 * The link itself stays a client-side upgrade (`footnote-bootstrap.ts`), which wraps the
 * characters without replacing them — so nothing moves visually when JS kicks in.
 *
 * Digits only: `⁽¹⁰⁾` composes fine, but there is no superscript `*`. A non-numeric key is
 * left untouched rather than half-converted; the client pass still handles it.
 */
export const superscriptFootnoteTokens = (text: string): string => {
	if (!text) return text;
	// Le contrôle éditorial doit voir les renvois DÉJÀ sous forme exposant, même quand il n'y
	// a aucun jeton à convertir — sinon la sortie anticipée ci-dessous les lui cacherait.
	if (isCollectingFootnotes()) collectRenderedReferences(text);

	if (text.indexOf("((") === -1) return text;
	return text.replace(FOOTNOTE_TOKEN, (match, raw: string) => {
		const key = raw.trim();
		if (isCollectingFootnotes()) collectFootnoteReference(key);
		if (!/^[0-9]+$/.test(key)) return match;
		let out = "⁽";
		for (const digit of key) out += SUPERSCRIPT_DIGITS[Number(digit)];
		return out + "⁾";
	});
};
