import { describe, it, expect } from "vitest";

import { buildSimulatorSubmitUrl } from "./simulatorFormSubmit";

/** Raccourci : construit l'objet URLSearchParams attendu par la fonction pure. */
const sp = (init?: Record<string, string>) => new URLSearchParams(init);

describe("buildSimulatorSubmitUrl", () => {
	it("returns null when no ctaHref is set", () => {
		expect(buildSimulatorSubmitUrl(undefined, sp({ amount: "5000" }))).toBeNull();
		expect(buildSimulatorSubmitUrl("", sp({ amount: "5000" }))).toBeNull();
	});

	it("returns null when the href has no hash (native submit suffices)", () => {
		expect(buildSimulatorSubmitUrl("/fr/simulateur.html?amount=5000", sp())).toBeNull();
	});

	it("appends params then the hash with a '?' on a bare path", () => {
		expect(
			buildSimulatorSubmitUrl("/fr/simulateur.html#/montant-financement", sp({ amount: "5000" })),
		).toBe("/fr/simulateur.html?amount=5000#/montant-financement");
	});

	it("uses '&' when the base URL already has a query string", () => {
		expect(
			buildSimulatorSubmitUrl("/fr/simulateur.html?idcatorigin=home#/montant", sp({ amount: "5000" })),
		).toBe("/fr/simulateur.html?idcatorigin=home&amount=5000#/montant");
	});

	it("preserves a multi-segment hash route whole (indexOf, not split)", () => {
		expect(buildSimulatorSubmitUrl("/p#/auto/recherche#step", sp({ project: "AUTO" }))).toBe(
			"/p?project=AUTO#/auto/recherche#step",
		);
	});

	it("keeps the base + hash untouched when there are no form params", () => {
		expect(buildSimulatorSubmitUrl("/p#frag", sp())).toBe("/p#frag");
	});

	it("serializes multiple form params before the hash", () => {
		expect(
			buildSimulatorSubmitUrl("/p#frag", sp({ project: "AUTO", amount: "100" })),
		).toBe("/p?project=AUTO&amount=100#frag");
	});
});
