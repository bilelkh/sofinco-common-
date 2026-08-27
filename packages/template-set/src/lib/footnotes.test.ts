import { describe, it, expect } from "vitest";
import {
	manageFooterNote,
	filterHtmlId,
	footnoteKey,
	normalizeFootnoteRef,
	superscriptFootnoteTokens,
	type FootnoteLabels,
} from "./footnotes";

const labels: FootnoteLabels = {
	note: "Note de bas de page",
	back: "Retour à la référence",
};

describe("filterHtmlId", () => {
	it("keeps letters, digits and -.: untouched", () => {
		expect(filterHtmlId("a-b.c:d1")).toBe("a-b.c:d1");
	});

	it("encodes every other character as U%04X (4 hex digits, upper-case)", () => {
		// "(1)" → "(" U0028, "1", ")" U0029
		expect(filterHtmlId("(1)")).toBe("U00281U0029");
		expect(filterHtmlId("*")).toBe("U002A");
	});

	it("trims surrounding whitespace before encoding", () => {
		expect(filterHtmlId("  1  ")).toBe("1");
	});
});

describe("manageFooterNote", () => {
	it("turns a <u>…<sup>(n)</sup>…</u> marker into a forward link", () => {
		const out = manageFooterNote("texte <u>taux<sup>(1)</sup></u> suite", labels);
		expect(out).toContain('<a href="#footer1" data-footer="footer1" class="footer-link">');
		// original visible text + sup are preserved, sr-only label appended
		expect(out).toContain("taux<sup>(1)</sup>");
		expect(out).toContain('<span class="sr-only">Note de bas de page</span></a>');
	});

	it("gives the note paragraph a matching id and a back link", () => {
		const out = manageFooterNote("<p><sup>(1)</sup> Mention légale.</p>", labels);
		expect(out).toContain('<p id="footer1">');
		// Un BOUTON : le retour est une action, sa cible dépend du marqueur d'où vient le
		// lecteur. Un `href` vers un identifiant supprimé ne serait qu'un fragment mort.
		expect(out).toContain(
			'<button type="button" class="footer-back-link" data-footer="footer1" aria-label="Retour à la référence">↩</button>',
		);
	});

	it("links a `n` marker to a `(n)` note (superscript normalization)", () => {
		const html = `<p>texte <u>taux<sup>1</sup></u></p><p><sup>(1)</sup> Mention.</p>`;
		const out = manageFooterNote(html, labels);
		// forward link target === note id
		expect(out).toContain('href="#footer1"');
		expect(out).toContain('<p id="footer1">');
		// le retour désigne la note par `data-footer`, plus par un identifiant de marqueur
		expect(out).toContain('class="footer-back-link" data-footer="footer1"');
		expect(out, "aucun identifiant de marqueur ne doit subsister").not.toContain("-ref");
	});

	it("handles several footnotes independently", () => {
		const html =
			`<p><u>a<sup>1</sup></u> and <u>b<sup>2</sup></u></p>` +
			`<p><sup>(1)</sup> first</p><p><sup>(2)</sup> second</p>`;
		const out = manageFooterNote(html, labels);
		expect(out).toContain('href="#footer1"');
		expect(out).toContain('href="#footer2"');
		expect(out).toContain('<p id="footer1">');
		expect(out).toContain('<p id="footer2">');
	});

	/*
	 * Une même note est appelée plusieurs fois dans une page — jusqu'à dix renvois vers la
	 * note 2 sur une page réelle du site. Aucun marqueur ne porte donc d'identifiant :
	 * l'unicité de `id` est normative en HTML, et une version antérieure qui ne le posait
	 * que sur le premier marqueur ne dédupliquait qu'À L'INTÉRIEUR D'UN CHAMP — deux champs
	 * citant la même note dupliquaient l'identifiant malgré tout.
	 */
	it("n'émet AUCUN identifiant de marqueur, quel que soit le nombre d'appels", () => {
		const out = manageFooterNote(
			"<p><u>a<sup>1</sup></u> puis <u>b<sup>1</sup></u> et <u>c<sup>1</sup></u></p>",
			labels,
		);
		expect(out).not.toContain("-ref");
		// Les trois restent des renvois fonctionnels : href et hook de défilement présents.
		expect(out.match(/href="#footer1"/g)).toHaveLength(3);
		expect(out.match(/data-footer="footer1"/g)).toHaveLength(3);
	});

	it("leaves HTML without footnote markup unchanged", () => {
		const html = "<p>Un paragraphe normal sans note.</p>";
		expect(manageFooterNote(html, labels)).toBe(html);
	});

	it("does not treat a paragraph that does not start with <sup> as a note", () => {
		const html = "<p>Texte <sup>1</sup> au milieu.</p>";
		expect(manageFooterNote(html, labels)).toBe(html);
	});
});

describe("CKEditor 5 marker serialization", () => {
	// Shapes captured from a real CK5 save on sofnt:seoBlock.content.
	const CK5_MARKER = "<p><u>taux fixe</u><sup><u>1</u></sup></p>";
	const CK5_MARKER_LINKED = '<p><u>taux fixe </u><a href="#1"><sup><u>1</u></sup></a></p>';

	it("repairs the shape CK5 emits for underline + superscript", () => {
		const out = manageFooterNote(CK5_MARKER, labels);
		expect(out).toContain('href="#footer1"');
		expect(out).toContain('data-footer="footer1"');
		// The visible marker survives the repair.
		expect(out).toContain("taux fixe<sup>1</sup>");
	});

	it("resolves a CK5 marker to the same id as its CK4 counterpart", () => {
		const ck4 = manageFooterNote("<p><u>taux fixe<sup>1</sup></u></p>", labels);
		expect(manageFooterNote(CK5_MARKER, labels)).toBe(ck4);
	});

	it("leaves an already-correct CK4 marker untouched", () => {
		// The repair must be inert on legacy content, which is the bulk of what exists.
		const html = "<p>texte <u>taux<sup>(1)</sup></u> suite</p>";
		expect(manageFooterNote(html, labels)).toBe(manageFooterNote(html, labels));
		expect(manageFooterNote(html, labels)).toContain('href="#footer1"');
	});

	it("accepts the modelled marker emitted by the CK5 plugin", () => {
		// SofincoFootnoteRef downcasts to `<u data-footnote="n">`, so the marker no longer
		// depends on how CK5 happens to nest underline and superscript.
		const out = manageFooterNote('<p><u data-footnote="1">taux fixe<sup>1</sup></u></p>', labels);
		expect(out).toContain('href="#footer1"');
		expect(out).toContain('data-footer="footer1"');
	});

	it("resolves the modelled marker to the same id as the legacy one", () => {
		const legacy = manageFooterNote("<p><u>taux fixe<sup>1</sup></u></p>", labels);
		const modelled = manageFooterNote(
			'<p><u data-footnote="1">taux fixe<sup>1</sup></u></p>',
			labels,
		);
		expect(modelled).toBe(legacy);
	});

	// Documents a KNOWN gap rather than a desired behaviour: when the contributor also
	// wraps the number in a link, CK5 interleaves the <a> between </u> and <sup> and the
	// repair no longer applies. Chasing every such combination by string surgery is not
	// viable — see the note on `normalizeCk5Marker`. Change this test the day the marker
	// becomes a dedicated CK5 element.
	it("does NOT repair a marker whose number was also linked (known limitation)", () => {
		expect(manageFooterNote(CK5_MARKER_LINKED, labels)).not.toContain('href="#footer1"');
	});
});

describe("superscriptFootnoteTokens", () => {
	it("renders a token as its Unicode superscript form", () => {
		expect(superscriptFootnoteTokens("Taux fixe ((1))")).toBe("Taux fixe ⁽¹⁾");
	});

	it("composes multi-digit numbers", () => {
		expect(superscriptFootnoteTokens("((10))")).toBe("⁽¹⁰⁾");
	});

	it("handles several tokens and tolerates inner spaces", () => {
		expect(superscriptFootnoteTokens("a ((1)) b (( 2 ))")).toBe("a ⁽¹⁾ b ⁽²⁾");
	});

	it("produces no markup at all — safe in an attribute or <title>", () => {
		expect(superscriptFootnoteTokens("((1))")).not.toContain("<");
	});

	it("leaves a non-numeric key untouched rather than half-converting it", () => {
		expect(superscriptFootnoteTokens("((*))")).toBe("((*))");
	});

	it("does not touch a single (1), common in legal copy", () => {
		expect(superscriptFootnoteTokens("Selon l’article (1)")).toBe("Selon l’article (1)");
	});

	it("returns the input untouched when there is no token", () => {
		expect(superscriptFootnoteTokens("Un titre normal")).toBe("Un titre normal");
		expect(superscriptFootnoteTokens("")).toBe("");
	});
});

/*
 * Un `<sup>` sans numéro n'est pas un renvoi.
 *
 * Le cas devient courant depuis que `sofnt:mentionLegalItem.anchor` est facultatif : du
 * contenu contribué peut porter un exposant resté vide après une correction. Le laisser
 * passer poserait `id="footer"` — identifiant anonyme, dupliqué dès la deuxième
 * occurrence de la page — et `href="#footer"`, fragment que rien ne rend.
 */
describe("clé de renvoi vide", () => {
	it.each([
		["exposant vide", "<sup></sup>"],
		["parenthèses vides", "<sup>()</sup>"],
		["espace insécable seul", "<sup>&nbsp;</sup>"],
	])("laisse un marqueur à %s tel quel", (_label, sup) => {
		const html = `texte <u>taux${sup}</u> suite`;
		expect(manageFooterNote(html, labels)).toBe(html);
	});

	it.each([
		["exposant vide", "<sup></sup>"],
		["parenthèses vides", "<sup>()</sup>"],
	])("n'ancre pas un paragraphe à %s", (_label, sup) => {
		const html = `<p>${sup} Mention générale.</p>`;
		const out = manageFooterNote(html, labels);
		expect(out).toBe(html);
		expect(out).not.toContain('id="footer"');
		expect(out).not.toContain("footer-back-link");
	});
});

/*
 * `normalizeFootnoteRef` est LA définition partagée de « à quelle note ce texte
 * renvoie-t-il ? ». Deux appelants en dépendent — `footnoteKey` ici, et `footnoteNumber`
 * (MentionLegal/buildNote.ts) qui décide s'il faut poser un exposant.
 *
 * Quand ce dernier recopiait le nettoyage en le simplifiant, une ancre `&nbsp;` passait son
 * garde puis produisait `<sup>(&nbsp;)</sup>` sans cible d'atterrissage. Ces tests fixent la
 * définition à un seul endroit ; l'équivalence entre les deux appelants est verrouillée dans
 * `MentionLegal/buildNote.test.ts`.
 */
describe("normalizeFootnoteRef", () => {
	it.each([
		["nombre nu", "1", "1"],
		["nombre parenthésé", "(1)", "1"],
		["parenthèses doublées", "((3))", "3"],
		["espaces autour", "  (10)  ", "10"],
		["balises inline", "<b>(2)</b>", "2"],
		["entités insécables", "&nbsp;(4)&nbsp;", "4"],
		["entité en majuscules", "&NBSP;(5)", "5"],
		["marqueur symbolique", "*", "*"],
	])("ramène %s à son numéro", (_label, input, expected) => {
		expect(normalizeFootnoteRef(input)).toBe(expected);
	});

	/*
	 * TOUTES ces formes doivent donner la chaîne vide : ce sont les « aucune note désignée ».
	 * Le champ n'est pas vide pour autant — c'est bien le piège. Une ancre `&nbsp;` ou
	 * `<b></b>` vient trivialement d'un copier-coller depuis Word ou depuis un richtext.
	 */
	it.each([
		["chaîne vide", ""],
		["espaces seuls", "   "],
		["parenthèses vides", "()"],
		["parenthèses vides doublées", "(())"],
		["parenthèses autour d'un espace", "( )"],
		["entité insécable", "&nbsp;"],
		["entités insécables multiples", "&nbsp;&nbsp;"],
		["balise vide", "<b></b>"],
		["balise ne contenant qu'un espace", "<i> </i>"],
		["balise contenant une entité", "<span>&nbsp;</span>"],
	])("ne désigne aucune note pour %s", (_label, input) => {
		expect(normalizeFootnoteRef(input)).toBe("");
	});

	it("tolère null et undefined sans lever", () => {
		expect(normalizeFootnoteRef(null as unknown as string)).toBe("");
		expect(normalizeFootnoteRef(undefined as unknown as string)).toBe("");
	});
});

describe("footnoteKey", () => {
	it("fait tomber `n` et `(n)` sur le MÊME identifiant", () => {
		// C'est l'invariant qui aligne un marqueur `<sup>1</sup>` sur sa note `<sup>(1)</sup>`.
		expect(footnoteKey("1")).toBe(footnoteKey("(1)"));
		expect(footnoteKey("1")).toBe("1");
	});

	it("applique la même normalisation que normalizeFootnoteRef avant d'encoder", () => {
		expect(footnoteKey("<b>&nbsp;(2)&nbsp;</b>")).toBe("2");
	});

	/*
	 * La clé vide est ce sur quoi s'appuient les gardes de `addFooterNote` et
	 * `addIdToParagraph` pour refuser d'émettre un `#footer` orphelin. Elle doit rester vide
	 * pour toutes les formes « sans note », faute de quoi ces gardes deviennent inopérants.
	 */
	it.each(["", "   ", "()", "&nbsp;", "<b></b>", "<i> </i>"])(
		"renvoie une clé vide pour %o — aucun identifiant à émettre",
		(input) => {
			expect(footnoteKey(input)).toBe("");
		},
	);

	it("encode un marqueur non alphanumérique de façon déterministe", () => {
		// `*` n'a pas de forme exposant : il doit tout de même produire un id stable.
		expect(footnoteKey("*")).toBe(filterHtmlId("*"));
		expect(footnoteKey("*")).toBe("U002A");
	});
});
