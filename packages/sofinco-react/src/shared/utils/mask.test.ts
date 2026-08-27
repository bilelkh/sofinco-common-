/*
 * Préréglages de masque du DS. Le regroupement lui-même, le caret et le retour
 * arrière appartiennent à `@react-input/mask` — ce n'est pas la bibliothèque
 * qu'on teste ici, mais le contrat que le DS pose par-dessus :
 *
 *  - les deux gabarits métier rendent bien `06 12 34 56 78` et
 *    `324 767 899 90963`, seul endroit où ces chiffrages sont écrits ;
 *  - `applyMask` est TOLÉRANT (valeur nue ou déjà ponctuée) alors que `unmask`
 *    ne l'est pas — c'est le piège de la bibliothèque, et il coûte des chiffres
 *    en silence.
 */
import { describe, expect, it } from "vitest";

import { MASKS, applyMask, maskedLength, resolveMask, unmask } from "./mask";

describe("applyMask", () => {
	it("groupe le téléphone deux par deux et le Siret en 3-3-3-5", () => {
		expect(applyMask("0612345678", "phone")).toBe("06 12 34 56 78");
		expect(applyMask("32476789990963", "siret")).toBe("324 767 899 90963");
	});

	it("ne pose les séparateurs qu'au fur et à mesure de la saisie", () => {
		expect(applyMask("", "phone")).toBe("");
		expect(applyMask("06", "phone")).toBe("06");
		expect(applyMask("061", "phone")).toBe("06 1");
		expect(applyMask("1222222", "siret")).toBe("122 222 2");
	});

	it("ignore ce qui n'est pas un chiffre et tronque au-delà du gabarit", () => {
		expect(applyMask("06.12.34.56.78", "phone")).toBe("06 12 34 56 78");
		expect(applyMask("0612345678999", "phone")).toBe("06 12 34 56 78");
		expect(applyMask("abc", "phone")).toBe("");
	});

	it("est idempotent — une valeur déjà groupée traverse sans doubler", () => {
		expect(applyMask("06 12 34 56 78", "phone")).toBe("06 12 34 56 78");
	});
});

describe("unmask", () => {
	it("retire les séparateurs d'un texte groupé", () => {
		expect(unmask("06 12 34 56 78", "phone")).toBe("0612345678");
		expect(unmask("324 767 899 90963", "siret")).toBe("32476789990963");
	});

	/*
	 * Verrou sur le piège de `unformat` : elle retire les caractères aux POSITIONS
	 * littérales du gabarit sans vérifier que c'en sont. Sur une valeur nue, elle
	 * mange donc un chiffre par séparateur. Ce test est là pour que la règle
	 * « `unmask` ne s'applique qu'à la valeur du DOM » ne se reperde pas.
	 */
	it("ne doit PAS être appliquée à une valeur déjà nue", () => {
		expect(unmask("0612345678", "phone")).not.toBe("0612345678");
	});
});

describe("resolveMask", () => {
	it("accepte un préréglage comme un gabarit sur mesure", () => {
		expect(resolveMask("phone")).toBe(MASKS.phone);

		const custom = { mask: "__/__/____", replacement: { _: /\d/ } };
		expect(resolveMask(custom)).toBe(custom);
		expect(applyMask("24122026", custom)).toBe("24/12/2026");
	});
});

describe("maskedLength", () => {
	it("compte les séparateurs, pas seulement les chiffres", () => {
		expect(maskedLength("phone")).toBe(14);
		expect(maskedLength("siret")).toBe(17);
	});
});
