import { describe, it, expect } from "vitest";
import { anchorIdOf, slugify } from "./slug";

describe("slugify", () => {
	it("lowercases and replaces non-word runs with single hyphens", () => {
		expect(slugify("Crédit à la Consommation")).toBe("cr-dit-la-consommation");
		expect(slugify("Hello   World!!")).toBe("hello-world");
	});

	it("trims leading/trailing hyphens", () => {
		expect(slugify("  (1) Mention  ")).toBe("1-mention");
		expect(slugify("***")).toBe("");
	});

	it("keeps digits and underscores (word chars)", () => {
		expect(slugify("Note_42")).toBe("note_42");
	});

	/*
	 * Invariant du composant Mentions légales : une ancre qui ne désigne aucune note doit
	 * produire une chaîne VIDE, et non un fragment bancal. `MentionLegal` la passe en
	 * `anchorId`, et le composant React rend `id={anchorId || undefined}` — donc un `id=""`,
	 * invalide, est évité par ce seul fait. Le cas `()` est le piège : le champ n'est pas
	 * vide, mais il n'en reste rien.
	 */
	it.each(["", "   ", "()", "(())", "( )"])(
		"renvoie une chaîne vide pour %o — pas d'id sur un texte sans renvoi",
		(input) => {
			expect(slugify(input)).toBe("");
		},
	);
});

describe("anchorIdOf", () => {
	/*
	 * LE DÉFAUT QUE CETTE FONCTION EXISTE POUR FERMER.
	 *
	 * `slugify` seul travaille sur la valeur BRUTE du champ : un `&nbsp;` laissé par un
	 * copier-coller Word y devient « nbsp », et la mention se rendait `<div id="nbsp">` —
	 * un point d'atterrissage dans le DOM, alors que `buildNote` n'avait posé aucun exposant
	 * pour y mener. `anchorIdOf` normalise D'ABORD, comme `footnoteNumber` et `footnoteKey`.
	 */
	it.each([
		["entité insécable", "&nbsp;", "nbsp"],
		["balises vides", "<b></b>", "b-b"],
		["entité dans une balise", "<span>&nbsp;</span>", "span-nbsp-span"],
	])("%s : ne pose plus d'id fantôme (%o donnait %o)", (_label, input) => {
		expect(anchorIdOf(input)).toBe("");
	});

	it.each(["", "   ", "()", "(())", "( )"])("renvoie une chaîne vide pour %o", (input) => {
		expect(anchorIdOf(input)).toBe("");
	});

	it.each([
		["numéro nu", "1", "1"],
		["numéro parenthésé", "(2)", "2"],
		["parenthèses doublées", "((3))", "3"],
		["numéro balisé", "<b>(4)</b>", "4"],
		["espaces et entités autour", "&nbsp;(10)&nbsp;", "10"],
	])("%s : %o → %o", (_label, input, expected) => {
		expect(anchorIdOf(input)).toBe(expected);
	});

	it("reste un slug pour les ancres textuelles", () => {
		// Une ancre n'est pas forcément un numéro : le composant accepte du texte libre.
		expect(anchorIdOf("Mention Auto")).toBe("mention-auto");
	});
});
