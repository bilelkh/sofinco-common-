/*
 * Contrat de l'adaptateur du référentiel des communes.
 *
 * Le référentiel n'est pas appelé ici : `fetch` est bouchonné. Ce qui est
 * vérifié, c'est ce que l'adaptateur existe pour absorber — une API sensible
 * aux accents et aux traits d'union, qui plafonne ses réponses, qui répond un
 * objet d'erreur là où le contrat annonce un tableau, et dont les codes postaux
 * ne sont pas uniques.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	CITIES_ENDPOINT,
	normalizeCityQuery,
	searchCities,
	searchCityOptions,
} from "./searchCities";

/** Réponse type du référentiel. */
const PAYLOAD = [
	{ label: "BOIRY BECQUERELLE (62128)", alternativeLabel: null, code: "62128" },
	{ label: "BOYELLES (62128)", alternativeLabel: null, code: "62128" },
	{ label: "ECOUST ST MEIN (62128)", alternativeLabel: "ECOUST SAINT MEIN (62128)", code: "62128" },
];

const stubFetch = (
	body: unknown,
	init: { ok?: boolean; status?: number } = {},
): ReturnType<typeof vi.fn> => {
	const spy = vi.fn(async () => ({
		ok: init.ok ?? true,
		status: init.status ?? 200,
		json: async () => body,
	}));
	vi.stubGlobal("fetch", spy);
	return spy;
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("normalizeCityQuery", () => {
	it("retire les diacritiques, que le référentiel n'apparie pas", () => {
		// « ORLÉANS » ne renvoie rien côté API, « ORLEANS » renvoie les deux communes.
		expect(normalizeCityQuery("ORLÉANS")).toBe("ORLEANS");
		expect(normalizeCityQuery("l'haÿ")).toBe("l hay");
	});

	it("ramène les séparateurs à l'espace, seul connu du référentiel", () => {
		expect(normalizeCityQuery("saint-denis")).toBe("saint denis");
		expect(normalizeCityQuery("l'haÿ-les-roses")).toBe("l hay les roses");
		expect(normalizeCityQuery("ST.MEIN")).toBe("ST MEIN");
	});

	it("réduit les espaces surnuméraires", () => {
		expect(normalizeCityQuery("  92   160 ")).toBe("92 160");
	});

	it("rend une chaîne vide sur une saisie qui n'est que du bruit", () => {
		expect(normalizeCityQuery("   ")).toBe("");
		expect(normalizeCityQuery("---")).toBe("");
	});
});

describe("searchCities", () => {
	it("n'appelle pas le référentiel sur une saisie vide, qu'il refuse par un 400", async () => {
		const spy = stubFetch(PAYLOAD);

		await expect(searchCities("   ")).resolves.toEqual([]);
		expect(spy).not.toHaveBeenCalled();
	});

	it("interroge le point d'entrée par défaut avec la saisie normalisée et encodée", async () => {
		const spy = stubFetch([]);

		await searchCities("saint-denis");

		expect(spy).toHaveBeenCalledOnce();
		expect(spy.mock.calls[0][0]).toBe(`${CITIES_ENDPOINT}?q=saint%20denis`);
	});

	it("accepte un point d'entrée de remplacement — recette, proxy Jahia", async () => {
		const spy = stubFetch([]);

		await searchCities("92", { endpoint: "https://recette.test/cities" });

		expect(spy.mock.calls[0][0]).toBe("https://recette.test/cities?q=92");
	});

	it("sépare le nom de la commune du code que le libellé répète", async () => {
		stubFetch(PAYLOAD);

		const cities = await searchCities("62128");

		expect(cities.map((city) => city.name)).toEqual([
			"BOIRY BECQUERELLE",
			"BOYELLES",
			"ECOUST ST MEIN",
		]);
		expect(cities[0].label).toBe("BOIRY BECQUERELLE (62128)");
	});

	it("ne retient la graphie alternative que lorsqu'elle existe", async () => {
		stubFetch(PAYLOAD);

		const cities = await searchCities("62128");

		expect(cities[0].alternativeLabel).toBeUndefined();
		expect(cities[2].alternativeLabel).toBe("ECOUST SAINT MEIN (62128)");
	});

	it("écarte les entrées amputées plutôt que de rendre un libellé vide", async () => {
		stubFetch([{ label: "SANS CODE" }, { code: "62128" }, PAYLOAD[1]]);

		const cities = await searchCities("62128");

		expect(cities).toHaveLength(1);
		expect(cities[0].name).toBe("BOYELLES");
	});

	it("rend une liste vide quand le référentiel répond un objet d'erreur en 200", async () => {
		// Le 400 sur `q` vide rend un objet, pas un tableau : un `.map` direct casserait.
		stubFetch({ code: "HAPPY_AUTO_VALIDATION_ERROR" });

		await expect(searchCities("92")).resolves.toEqual([]);
	});

	it("laisse remonter un statut non-2xx, que le panneau rend en ligne d'état", async () => {
		stubFetch({}, { ok: false, status: 503 });

		await expect(searchCities("92")).rejects.toThrow("503");
	});

	it("transmet le signal d'annulation au réseau", async () => {
		const spy = stubFetch([]);
		const controller = new AbortController();

		await searchCities("92", { signal: controller.signal });

		expect(spy.mock.calls[0][1]).toMatchObject({ signal: controller.signal });
	});
});

describe("searchCityOptions", () => {
	it("range le code en valeur et la commune dans `meta` — un code vaut pour plusieurs communes", async () => {
		stubFetch(PAYLOAD);

		const options = await searchCityOptions("62128");

		// Les trois options partagent la même valeur : c'est le libellé, et lui
		// seul, qui distingue le choix de l'utilisateur.
		expect(options.map((option) => option.value)).toEqual(["62128", "62128", "62128"]);
		expect(options[1]).toEqual({
			value: "62128",
			label: "BOYELLES (62128)",
			meta: { code: "62128", city: "BOYELLES" },
		});
	});
});
