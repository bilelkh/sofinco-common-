import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { makeNode } from "#test/jahia";
import type { JCRNodeWrapper } from "org.jahia.services.content";

interface FakeBridge {
	getAverageRate?(node: JCRNodeWrapper): unknown;
	fetchReviews?(limit: number, product: string, minNote: number, node: JCRNodeWrapper): unknown;
}

const getReviewServiceBridge = vi.fn<() => FakeBridge | null>(() => null);

// `#lib/javaBridge` importe `server` de la lib Jahia, indisponible hors du moteur : on la
// neutralise pour pouvoir charger le vrai module.
vi.mock("@jahia/javascript-modules-library", () => ({ server: { osgi: { getService: vi.fn() } } }));

// Seule la résolution du service OSGi est simulée. `readString` / `readNumber` / `toArray`
// restent les vraies implémentations : leurs coercions font partie de ce qu'on teste ici,
// les ré-écrire dans le mock reviendrait à tester une copie.
vi.mock("#lib/javaBridge", async (importOriginal) => ({
	...(await importOriginal<typeof import("#lib/javaBridge")>()),
	getReviewServiceBridge: () => getReviewServiceBridge(),
}));

import { LOG_WINDOW_MS, readAverageRating, readReviews } from "./reviews";

const config = () => makeNode({ nodeTypes: ["spnt:configVerifedReview"] });

let consoleWarn: MockInstance<typeof console.warn>;

// `logThrottled` porte une horloge au niveau du module, partagée par tout le fichier. On
// avance une horloge MONOTONE d'un jour avant chaque test, pour qu'aucun test n'hérite du
// silence installé par le précédent. Deux précautions :
//  - un simple `Date.now() + fenêtre` dans le `beforeEach` ne suffirait pas —
//    `useFakeTimers` repart de l'heure réelle à chaque pose, tous les tests retomberaient
//    donc sur le même instant ;
//  - le pas est très supérieur à la fenêtre, car un test peut avancer le temps chez lui.
let clock = Date.now();
const TEST_CLOCK_STEP_MS = 86_400_000; // 1 jour

beforeEach(() => {
	getReviewServiceBridge.mockReset();
	getReviewServiceBridge.mockReturnValue(null);
	consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

	clock += TEST_CLOCK_STEP_MS;
	vi.useFakeTimers();
	vi.setSystemTime(clock);
});

afterEach(() => {
	vi.useRealTimers();
	consoleWarn.mockRestore();
});

describe("readAverageRating", () => {
	it("projette le bean en données JS simples", () => {
		getReviewServiceBridge.mockReturnValue({
			getAverageRate: () => ({ average: "4.23", nbReview: "3576" }),
		});
		expect(readAverageRating(config())).toEqual({ ratingValue: 4.23, reviewCount: 3576 });
	});

	it("retourne null sans configuration, sans bridge ou sans note", () => {
		expect(readAverageRating(null)).toBeNull();
		expect(readAverageRating(config())).toBeNull();

		getReviewServiceBridge.mockReturnValue({ getAverageRate: () => null });
		expect(readAverageRating(config())).toBeNull();
	});

	it("retourne null quand les valeurs ne sont pas numériques", () => {
		getReviewServiceBridge.mockReturnValue({
			getAverageRate: () => ({ average: "n/a", nbReview: "12" }),
		});
		expect(readAverageRating(config())).toBeNull();
	});

	it("absorbe une levée du bridge", () => {
		getReviewServiceBridge.mockReturnValue({
			getAverageRate: () => {
				throw new Error("OSGi service unavailable");
			},
		});
		expect(readAverageRating(config())).toBeNull();
	});

	it("absorbe une levée de la résolution du service OSGi", () => {
		getReviewServiceBridge.mockImplementation(() => {
			throw new Error("bundle portal-common-sofinco inactive");
		});
		expect(readAverageRating(config())).toBeNull();
	});
});

/**
 * Reproduit ce que GraalVM renvoie réellement : une `List` Java exposée en proxy indexé
 * (`length` + accès par index), et NON un `Array` — `.map()` dessus lèverait.
 */
const javaList = (...records: Record<string, unknown>[]): ArrayLike<Record<string, unknown>> =>
	Object.freeze({ ...records, length: records.length });

const options = { limit: 10, productId: "PRET_PERSO", minNote: 4 };

describe("readReviews", () => {
	it("projette la liste et compose l'auteur", () => {
		const fetchReviews = vi.fn(() =>
			javaList({
				order_id: "CMD-42",
				rate: "5",
				review: "Parfait",
				firstname: "Gérard",
				lastname: "Martin",
				order_date: "2026-01-12",
				review_date: "2026-01-15",
			}),
		);
		getReviewServiceBridge.mockReturnValue({ fetchReviews });

		expect(readReviews(config(), options)).toEqual([
			{
				id: "CMD-42",
				rating: 5,
				text: "Parfait",
				author: "Gérard M.",
				realizedDate: "2026-01-12",
				publishedDate: "2026-01-15",
			},
		]);
		expect(fetchReviews).toHaveBeenCalledWith(10, "PRET_PERSO", 4, expect.anything());
	});

	it("n'ajoute aucune propriété d'affichage", () => {
		getReviewServiceBridge.mockReturnValue({
			fetchReviews: () => javaList({ order_id: "CMD-1", firstname: "Léa" }),
		});
		expect(readReviews(config(), options)[0]).not.toHaveProperty("tone");
	});

	it("replie l'auteur et l'identifiant quand la donnée est absente", () => {
		getReviewServiceBridge.mockReturnValue({
			fetchReviews: () => javaList({ firstname: "", lastname: "" }, { firstname: "Léa" }),
		});

		const reviews = readReviews(config(), options);
		expect(reviews.map((r) => r.id)).toEqual(["review-0", "review-1"]);
		expect(reviews.map((r) => r.author)).toEqual(["Client Sofinco", "Léa"]);
		expect(reviews[0].rating).toBe(0);
		expect(reviews[0].text).toBe("");
	});

	it("retourne une liste vide sans configuration, sans bridge ou sans liste", () => {
		expect(readReviews(null, options)).toEqual([]);
		expect(readReviews(config(), options)).toEqual([]);

		getReviewServiceBridge.mockReturnValue({ fetchReviews: () => null });
		expect(readReviews(config(), options)).toEqual([]);
	});

	it("absorbe une levée du bridge et de la résolution du service", () => {
		getReviewServiceBridge.mockReturnValue({
			fetchReviews: () => {
				throw new Error("APIM timeout");
			},
		});
		expect(readReviews(config(), options)).toEqual([]);

		getReviewServiceBridge.mockImplementation(() => {
			throw new Error("bundle portal-common-sofinco inactive");
		});
		expect(readReviews(config(), options)).toEqual([]);
	});
});

describe("traces", () => {
	it("signale un pont absent, puis se tait pendant la fenêtre", () => {
		readAverageRating(config());
		expect(consoleWarn).toHaveBeenCalledTimes(1);
		expect(consoleWarn.mock.calls[0][0]).toContain("introuvable");

		// Même panne, même fenêtre : le sticker est rendu sur toutes les pages du site,
		// une trace par rendu noierait les logs.
		readAverageRating(config());
		readReviews(config(), options);
		expect(consoleWarn).toHaveBeenCalledTimes(1);

		// Fenêtre écoulée : une panne qui dure doit produire un nouveau signal.
		vi.advanceTimersByTime(LOG_WINDOW_MS + 1);
		readAverageRating(config());
		expect(consoleWarn).toHaveBeenCalledTimes(2);
	});

	it("n'étouffe pas une panne derrière une autre", () => {
		readAverageRating(config());

		getReviewServiceBridge.mockImplementation(() => {
			throw new Error("bundle portal-common-sofinco inactive");
		});
		readAverageRating(config());

		// Deux messages distincts dans la même fenêtre : le second n'est pas masqué.
		expect(consoleWarn).toHaveBeenCalledTimes(2);
		expect(consoleWarn.mock.calls[1][0]).toContain("a levé");
	});

	it("ne trace rien quand la configuration est absente — ce n'est pas une panne", () => {
		expect(readAverageRating(null)).toBeNull();
		expect(readReviews(null, options)).toEqual([]);
		expect(consoleWarn).not.toHaveBeenCalled();
	});
});

describe("isolation des lecteurs", () => {
	it("rend la note moyenne même quand les avis échouent", () => {
		getReviewServiceBridge.mockReturnValue({
			getAverageRate: () => ({ average: "4.5", nbReview: "10" }),
			fetchReviews: () => {
				throw new Error("APIM timeout");
			},
		});

		expect(readReviews(config(), options)).toEqual([]);
		expect(readAverageRating(config())).toEqual({ ratingValue: 4.5, reviewCount: 10 });
	});
});
