/**
 * Découpage d'un texte portant des renvois de note en segments rendables.
 *
 * FONCTION PURE, sans React, sans DOM, sans contexte et sans globale — et c'est la
 * propriété qui compte. Le même texte produit exactement le même résultat sur le serveur
 * et dans le navigateur, donc un `Island` s'hydrate sans rien à réconcilier.
 *
 * Une version antérieure faisait transiter le libellé a11y et la liste des notes par un
 * contexte React : ça ne franchit PAS la frontière d'un îlot (il s'hydrate comme sa propre
 * racine, avec ses seules props sérialisées), donc serveur et client divergeaient et React
 * échouait sur l'erreur #418. D'où l'absence totale de dépendance ici.
 *
 * Le texte reçu porte normalement déjà la forme exposant `⁽¹⁾`, produite côté serveur par
 * `superscriptFootnoteTokens` (template-set, appliqué dans `str()`). Le jeton brut `((1))`
 * est accepté aussi, comme filet pour une valeur qui n'aurait pas transité par `str()`.
 */

/** Chiffres en exposant, indexés par leur valeur : `SUPERSCRIPT_DIGITS[3] === "³"`. */
export const SUPERSCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/** `⁽¹⁾` (forme rendue par le serveur) ou `((1))` (jeton brut, filet). */
const REFERENCE = /⁽([⁰¹²³⁴⁵⁶⁷⁸⁹]{1,8})⁾|\(\(\s*([^()]{1,32}?)\s*\)\)/g;

export type FootnoteSegment =
	| { kind: "text"; value: string }
	| {
			kind: "reference";
			/**
			 * Numéro en chiffres simples, ex. `"3"` — sert à construire `#footer3`, et c'est
			 * aussi ce qui est RENDU, dans un `<sup>` (cf. `FootnoteText`).
			 */
			number: string;
			/**
			 * Forme exposant telle qu'elle apparaît dans le FLUX TEXTE, ex. `"⁽³⁾"`.
			 *
			 * Ce n'est PAS ce qui est affiché par `FootnoteText`, qui émet un vrai `<sup>` avec
			 * des chiffres ASCII : les caractères exposant Unicode sont répartis sur deux blocs
			 * (`¹²³` en Latin-1, `⁰⁴⁵⁶⁷⁸⁹` et `⁽⁾` en Superscripts and Subscripts) et les
			 * polices du site ne couvrent pas le second — les parenthèses tombent en repli
			 * système partout, et les notes ≥ 4 changent carrément de police en contexte Cutta.
			 *
			 * Ce champ reste utile là où le balisage est impossible : `<title>`, meta, `alt`,
			 * libellés de l'arbre jContent. Il sert aussi à mesurer la longueur consommée dans
			 * la chaîne source.
			 */
			visible: string;
	  };

/** `⁽¹⁰⁾` → `"10"`, ou `""` si un caractère n'est pas un chiffre en exposant. */
function fromSuperscript(text: string): string {
	let out = "";
	for (const char of text) {
		const digit = SUPERSCRIPT_DIGITS.indexOf(char);
		if (digit === -1) return "";
		out += String(digit);
	}
	return out;
}

/** `"10"` → `"⁽¹⁰⁾"`. */
function toSuperscript(value: string): string {
	let out = "⁽";
	for (const digit of value) out += SUPERSCRIPT_DIGITS.charAt(Number(digit));
	return out + "⁾";
}

/** Découpe `text` en segments texte et renvois. */
export function splitFootnoteText(text: string): FootnoteSegment[] {
	if (!hasFootnoteReference(text)) return [{ kind: "text", value: text }];

	const segments: FootnoteSegment[] = [];
	let cursor = 0;
	let match: RegExpExecArray | null;

	REFERENCE.lastIndex = 0;
	while ((match = REFERENCE.exec(text)) !== null) {
		const number = match[1] ? fromSuperscript(match[1]) : (match[2] || "").trim();
		// Seules les clés numériques ont une forme exposant ; le reste reste du texte.
		if (!/^[0-9]+$/.test(number)) continue;

		if (match.index > cursor) {
			segments.push({ kind: "text", value: text.slice(cursor, match.index) });
		}
		segments.push({ kind: "reference", number, visible: toSuperscript(number) });
		cursor = match.index + match[0].length;
	}

	if (segments.length === 0) return [{ kind: "text", value: text }];
	if (cursor < text.length) segments.push({ kind: "text", value: text.slice(cursor) });
	return segments;
}

/** Vrai si `text` porte au moins un renvoi — permet de sauter le découpage. */
export function hasFootnoteReference(text: string): boolean {
	return !!text && (text.indexOf("⁽") !== -1 || text.indexOf("((") !== -1);
}

/**
 * Ids des notes référencées par `value`, dans l'ordre d'apparition et sans doublon —
 * `"Taux fixe ⁽¹⁾ hors assurance ⁽²⁾"` → `["footer1", "footer2"]`.
 *
 * Sert au câblage `aria-describedby` des éléments interactifs (`Cta`, `Link`) : là, le
 * renvoi est rendu INERTE (imbriquer un lien dans un lien est invalide) et masqué aux
 * technologies d'assistance, sinon le numéro rejoint le nom accessible du bouton et le
 * lecteur d'écran annonce « Je profite de l'offre 2 ». `aria-describedby` rétablit
 * l'information par le bon canal : le bouton est DÉCRIT par la note, sans que celle-ci
 * pollue son nom.
 *
 * Une référence orpheline (note absente de la page) produit un id qui ne résout pas ;
 * `aria-describedby` ignore silencieusement une référence morte, donc aucun effet de bord.
 *
 * Accepte `unknown` pour être appelable directement sur une prop `ReactNode` : tout ce qui
 * n'est pas une chaîne ne porte pas de renvoi exploitable ici.
 */
export function footnoteNoteIds(value: unknown): string[] {
	if (typeof value !== "string" || !hasFootnoteReference(value)) return [];

	const ids: string[] = [];
	for (const segment of splitFootnoteText(value)) {
		if (segment.kind !== "reference") continue;
		const id = `footer${segment.number}`;
		if (!ids.includes(id)) ids.push(id);
	}
	return ids;
}

/**
 * Valeur prête à poser sur `aria-describedby`, ou `undefined` s'il n'y a aucun renvoi —
 * pour ne pas émettre un attribut vide, que React sérialiserait quand même.
 */
export function footnoteDescribedBy(value: unknown): string | undefined {
	const ids = footnoteNoteIds(value);
	return ids.length ? ids.join(" ") : undefined;
}
