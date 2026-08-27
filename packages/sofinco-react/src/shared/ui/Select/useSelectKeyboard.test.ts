/*
 * La navigation clavier n'est plus déléguée à une librairie : elle est à nous,
 * donc elle se teste. Ce fichier couvre les deux fonctions pures qui la portent
 * — le reste (ouverture, focus, clic extérieur) relève du DOM et du navigateur.
 */
import { describe, expect, it } from "vitest";

import { findEnabled, matchTypeahead } from "./useSelectKeyboard";
import type { SelectOption } from "./Select.type";

const OPTIONS: SelectOption[] = [
	{ value: "a", label: "Alpha" },
	{ value: "b", label: "Bravo", disabled: true },
	{ value: "c", label: "Charlie" },
	{ value: "d", label: "Delta" },
	{ value: "e", label: "Copain" },
];

describe("findEnabled", () => {
	it("renvoie l'index quand l'option est déjà sélectionnable", () => {
		expect(findEnabled(OPTIONS, 0, 1)).toBe(0);
	});

	it("saute les options désactivées en avançant", () => {
		expect(findEnabled(OPTIONS, 1, 1)).toBe(2);
	});

	it("saute les options désactivées en reculant", () => {
		expect(findEnabled(OPTIONS, 1, -1)).toBe(0);
	});

	it("bute en bout de liste plutôt que de boucler", () => {
		// Les flèches ne bouclent pas, comme sur un `<select>` natif.
		expect(findEnabled(OPTIONS, OPTIONS.length, 1)).toBe(-1);
		expect(findEnabled(OPTIONS, -1, -1)).toBe(-1);
	});
});

describe("matchTypeahead", () => {
	it("trouve une option sur une seule lettre", () => {
		expect(matchTypeahead("", OPTIONS, "a", -1).index).toBe(0);
	});

	it("cumule les frappes rapprochées", () => {
		const first = matchTypeahead("", OPTIONS, "c", -1);
		expect(first.index).toBe(2); // Charlie

		// « c » puis « h » → « ch » : Charlie, et non Copain.
		expect(matchTypeahead(first.buffer, OPTIONS, "h", first.index).index).toBe(2);
	});

	it("fait défiler les options sur une lettre répétée", () => {
		const first = matchTypeahead("", OPTIONS, "c", -1);
		expect(first.index).toBe(2); // Charlie

		const second = matchTypeahead(first.buffer, OPTIONS, "c", first.index);
		expect(second.index).toBe(4); // Copain
	});

	it("ignore les options désactivées", () => {
		expect(matchTypeahead("", OPTIONS, "b", -1).index).toBe(-1);
	});

	it("renvoie -1 quand rien ne correspond", () => {
		expect(matchTypeahead("", OPTIONS, "z", -1).index).toBe(-1);
	});

	it("boucle en fin de liste pour retrouver le début", () => {
		// La recherche, elle, boucle : depuis la dernière option, « a » repart sur Alpha.
		expect(matchTypeahead("", OPTIONS, "a", 4).index).toBe(0);
	});

	it("est insensible à la casse", () => {
		expect(matchTypeahead("", OPTIONS, "A", -1).index).toBe(0);
	});
});
