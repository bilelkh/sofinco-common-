import { describe, it, expect, vi } from "vitest";

/*
 * buildNote délègue la réécriture finale à `manageFooterNote` : on le stube pour assertir
 * le HTML exact qui lui est passé (le placement du `<sup>` est ce que cette unité possède).
 *
 * Le RESTE du module reste RÉEL — `importActual`. `footnoteNumber` délègue désormais à
 * `normalizeFootnoteRef`, et le test d'équivalence ci-dessous compare à `footnoteKey` : les
 * remplacer par des stubs ne validerait plus rien, et un mock exhaustif recréerait
 * exactement la duplication que ce module supprime.
 */
vi.mock("#lib/footnotes", async (importActual) => ({
	...(await importActual<typeof import("#lib/footnotes")>()),
	manageFooterNote: vi.fn((html: string) => `<<${html}>>`),
}));

import { manageFooterNote, footnoteKey } from "#lib/footnotes";
import { buildNote, footnoteNumber } from "./buildNote";

const labels = { note: "note", back: "back" };

describe("buildNote", () => {
	it("injects the <sup> marker inside an existing leading <p>", () => {
		buildNote("(2)", "<p>Texte légal</p>", labels);
		expect(manageFooterNote).toHaveBeenCalledWith("<p><sup>(2)</sup> Texte légal</p>", labels);
	});

	it("wraps bare content in a <p> with the marker", () => {
		buildNote("3", "Texte sans paragraphe", labels);
		expect(manageFooterNote).toHaveBeenCalledWith(
			"<p><sup>(3)</sup> Texte sans paragraphe</p>",
			labels,
		);
	});

	it("strips surrounding parentheses and whitespace from the anchor", () => {
		buildNote("  ((4))  ", "<p>x</p>", labels);
		expect(manageFooterNote).toHaveBeenCalledWith("<p><sup>(4)</sup> x</p>", labels);
	});

	it("returns whatever manageFooterNote produced", () => {
		expect(buildNote("1", "<p>a</p>", labels)).toBe("<<<p><sup>(1)</sup> a</p>>>");
	});

	/*
	 * Envelopper un bloc dans un <p> produit du HTML invalide : le navigateur referme le
	 * <p> avant le bloc et restructure le DOM. Le serveur envoie alors un arbre, le
	 * navigateur en construit un autre, et toute hydratation React dans ce sous-arbre
	 * échoue sur l'erreur #418.
	 */
	it.each([
		["une liste", "<ul><li>Point</li></ul>"],
		["une liste ordonnée", "<ol><li>Point</li></ol>"],
		["une citation", "<blockquote>Citation</blockquote>"],
		["un div", "<div>Bloc</div>"],
		["un titre", "<h3>Titre</h3>"],
		["un tableau", "<table><tr><td>x</td></tr></table>"],
	])("ne met jamais %s dans un <p>", (_label, content) => {
		buildNote("1", content, labels);
		const produced = vi.mocked(manageFooterNote).mock.calls.at(-1)![0];

		// Le marqueur a son propre paragraphe, le bloc reste à la racine.
		expect(produced).toBe(`<p><sup>(1)</sup></p>${content}`);

		// Invariant : aucun bloc entre un `<p>` ouvrant et son `</p>`. La négation dans la
		// classe empêche le motif de franchir la fermeture du paragraphe.
		expect(produced).not.toMatch(
			/<p[^>]*>(?:(?!<\/p>)[\s\S])*<(ul|ol|div|table|h[1-6]|blockquote)\b/i,
		);
	});

	it("garde le marqueur dans un paragraphe repérable par addIdToParagraph", () => {
		// C'est ce paragraphe qui recevra `id="footerN"` et la flèche de retour ↩.
		buildNote("7", "<ul><li>Point</li></ul>", labels);
		const produced = vi.mocked(manageFooterNote).mock.calls.at(-1)![0];
		expect(produced.startsWith("<p><sup>(7)</sup></p>")).toBe(true);
	});
});

/*
 * TEXTE SANS RENVOI — le cas remonté en recette.
 *
 * `anchor` n'est plus obligatoire dans le CND : une mention générale (copyright,
 * avertissement, conditions communes) doit pouvoir s'écrire sans numéro. Le défaut
 * d'origine n'était pas l'obligation elle-même mais ce qu'elle masquait : dès que l'ancre
 * ne portait pas de numéro, `<sup>()</sup>` s'affichait — des parenthèses vides devant un
 * texte qui n'appelle aucune note.
 */
describe("buildNote — mention sans renvoi", () => {
	// C'est le PIÈGE : le champ n'est pas vide, mais après retrait des parenthèses il ne
	// reste rien. Tester la valeur brute rendrait « () » ; on teste le numéro normalisé.
	it.each([
		["champ vide", ""],
		["espaces seuls", "   "],
		["parenthèses vides", "()"],
		["parenthèses vides doublées", "(())"],
		["parenthèses vides entourées d'espaces", "  ( )  "],
		// Copier-coller depuis Word ou depuis un champ richtext : l'ancre paraît remplie mais
		// ne désigne aucune note. C'est par cette porte que le défaut est revenu une fois.
		["entité insécable", "&nbsp;"],
		["entités insécables multiples", "&nbsp;&nbsp;"],
		["balise vide", "<b></b>"],
		["balise ne contenant qu'un espace", "<i> </i>"],
	])("ne pose aucun exposant quand l'ancre est %s", (_label, anchor) => {
		buildNote(anchor, "<p>Texte légal général</p>", labels);
		expect(manageFooterNote).toHaveBeenCalledWith("<p>Texte légal général</p>", labels);
	});

	it("ne rend jamais de parenthèses vides", () => {
		buildNote("()", "<p>Texte</p>", labels);
		const produced = vi.mocked(manageFooterNote).mock.calls.at(-1)![0];
		expect(produced).not.toContain("<sup>");
		expect(produced).not.toContain("()");
	});

	// Le contenu part TEL QUEL : pas de `<p>` d'emballage, donc pas d'HTML invalide sur un
	// contenu qui commence par un bloc (même invariant que pour les notes numérotées).
	it.each([
		["une liste", "<ul><li>Point</li></ul>"],
		["un titre", "<h3>Titre</h3>"],
		["du texte brut", "Texte sans balise"],
	])("laisse %s intact", (_label, content) => {
		buildNote("", content, labels);
		expect(manageFooterNote).toHaveBeenCalledWith(content, labels);
	});

	/*
	 * On désactive l'ANCRAGE, pas le lien SORTANT : un texte libre peut lui-même citer une
	 * note. Le passage par `manageFooterNote` reste donc obligatoire — c'est lui qui
	 * transforme <u>…<sup>(2)</sup></u> en lien vers #footer2.
	 */
	it("passe quand même par manageFooterNote pour ses propres renvois", () => {
		const content = "<p>Voir <u>les conditions<sup>(2)</sup></u></p>";
		expect(buildNote("", content, labels)).toBe(`<<${content}>>`);
		expect(manageFooterNote).toHaveBeenCalledWith(content, labels);
	});
});

describe("footnoteNumber", () => {
	it.each([
		["1", "1"],
		["(1)", "1"],
		["  (10)  ", "10"],
		["((3))", "3"],
	])("normalise %s en %s", (input, expected) => {
		expect(footnoteNumber(input)).toBe(expected);
	});

	it.each(["", "   ", "()", "(())", "( )", "&nbsp;", "&nbsp;&nbsp;", "<b></b>", "<i> </i>"])(
		"renvoie une chaîne vide pour %o — aucune note désignée",
		(input) => {
			expect(footnoteNumber(input)).toBe("");
		},
	);
});

/*
 * INVARIANT DE NON-DIVERGENCE.
 *
 * `footnoteNumber` décide s'il faut poser un exposant ; `footnoteKey` décide si un id
 * d'atterrissage est réellement émis. Les deux DOIVENT répondre pareil à « y a-t-il une
 * note ? », sinon on rend un `<sup>` sans cible — le défaut exact remonté sur les ancres
 * `&nbsp;`, quand `footnoteNumber` recopiait un nettoyage plus pauvre.
 *
 * Ce test épingle l'équivalence sur toutes les formes qu'un contributeur peut produire.
 * Il échouerait immédiatement si quelqu'un réintroduisait une normalisation locale.
 */
describe("footnoteNumber ≡ footnoteKey", () => {
	it.each([
		"",
		"   ",
		"()",
		"(())",
		"( )",
		"&nbsp;",
		"&NBSP;",
		"&nbsp;&nbsp;",
		"<b></b>",
		"<i> </i>",
		"<span>&nbsp;</span>",
		"1",
		"(1)",
		"  (10)  ",
		"((3))",
		"<b>(2)</b>",
		"&nbsp;(4)&nbsp;",
		"*",
	])("s'accordent sur la présence d'une note pour %o", (input) => {
		expect(!!footnoteNumber(input)).toBe(!!footnoteKey(input));
	});
});
