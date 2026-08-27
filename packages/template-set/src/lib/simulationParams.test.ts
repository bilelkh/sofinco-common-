import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";
import type { RenderContext } from "org.jahia.services.render";

// Les helpers JCR réels sont liés au contexte SSR ; on les remplace par les
// réimplémentations pilotées par données de `#test/jahia`. Même pattern que
// `simulatorCta.test.ts` / `cta.test.ts`.
vi.mock("./jcr", async () => import("#test/jahia"));

import {
	hasSimulationParams,
	readSimulationParamsFromPage,
	readSimulationParams,
	readSimulationParamsState,
	SIMULATION_PARAMS_MIXIN,
	SIMULATION_DEFAULT_AMOUNT,
	SIMULATION_DEFAULT_DURATION,
} from "./simulationParams";

/** Page portant (ou non) le mixin de simulation. */
const page = (props: Record<string, string | number> = {}, withMixin = true) =>
	makeNode({
		nodeTypes: withMixin ? ["jnt:page", SIMULATION_PARAMS_MIXIN] : ["jnt:page"],
		props,
	});

const rcWith = (node: ReturnType<typeof page>): RenderContext =>
	({ getMainResource: () => ({ getNode: () => node }) }) as unknown as RenderContext;

/* ────────────────────────────────────────────────────────────────────────── */

describe("hasSimulationParams", () => {
	it.each<[string, ReturnType<typeof page> | null, boolean]>([
		["null", null, false],
		["page sans le mixin", page({}, false), false],
		["page avec le mixin", page({ simProduct: "CR" }), true],
	])("%s → %s", (_, node, expected) => {
		expect(hasSimulationParams(node)).toBe(expected);
	});

	it("mixin présent mais produit vide → toujours true (l'option EST activée)", () => {
		expect(hasSimulationParams(page({ simProduct: "" }))).toBe(true);
	});
});

describe("readSimulationParamsFromPage", () => {
	it("lit les cinq propriétés du mixin", () => {
		expect(
			readSimulationParamsFromPage(
				page({
					simProduct: "RAC",
					simAmount: 12000,
					simDuration: 84,
					simScaleCode: "BAREME7",
					simSourceId: "NEOURL02",
				}),
			),
		).toEqual({
			product: "RAC",
			amount: 12000,
			duration: 84,
			scaleCode: "BAREME7",
			sourceId: "NEOURL02",
		});
	});

	/*
	 * Le mixin n'a PLUS de valeur `autocreated` : ces défauts ne viennent donc plus du CND de
	 * page mais de `sofnt:representativeExampleConfig`, le nœud de config de site que le rendu
	 * consulte quand la page est muette. Ce module ne pilote aucun appel APIM — il alimente
	 * l'aperçu en édition — et doit donc montrer ce que le rendu utilisera réellement.
	 */
	it("retombe sur les défauts de site quand montant et durée sont absents", () => {
		const params = readSimulationParamsFromPage(page({ simProduct: "PB" }));
		expect(params?.amount).toBe(SIMULATION_DEFAULT_AMOUNT);
		expect(params?.duration).toBe(SIMULATION_DEFAULT_DURATION);
	});

	/*
	 * VERROU DE VALEUR, et non de symbole.
	 *
	 * Le test ci-dessus compare aux constantes : il passerait quelle que soit leur valeur, y
	 * compris une qui casserait la production. Or ce couple est le résultat d'un arbitrage — il
	 * doit rester valide pour les TROIS produits, dont les enveloppes divergent :
	 *
	 *   CR  150 – 10 000 €    10 – 60 mois
	 *   PB  3 001 – 75 000 €  12 – 120 mois
	 *   RAC 3 001 – 100 000 € 36 – 120 mois
	 *
	 * 3 000 € passe sous le plancher du PB et du RAC ; 15 000 € dépasse le plafond du CR. Le
	 * couple 5 000 / 48 est le seul rond qui tienne partout, et 48 mois sort en prime du
	 * plancher exact du RAC. Le pendant Java est
	 * `CampaignConsistencyTest#siteDefaultsStayValidForEveryProduct`, qui vérifie les bornes ;
	 * ici on verrouille la VALEUR, pour que les deux côtés ne dérivent pas l'un de l'autre.
	 */
	it("les défauts de site restent alignés sur ceux du nœud de config", () => {
		expect(SIMULATION_DEFAULT_AMOUNT).toBe(5000);
		expect(SIMULATION_DEFAULT_DURATION).toBe(48);
	});

	/** Une valeur explicite reste prioritaire — la cascade ne joue qu'à défaut. */
	it("une valeur saisie sur la page l'emporte sur le défaut de site", () => {
		const params = readSimulationParamsFromPage(
			page({ simProduct: "CR", simAmount: 2500, simDuration: 24 }),
		);
		expect(params?.amount).toBe(2500);
		expect(params?.duration).toBe(24);
	});

	it("page nulle ou sans mixin → null", () => {
		expect(readSimulationParamsFromPage(null)).toBeNull();
		expect(readSimulationParamsFromPage(page({ simProduct: "CR" }, false))).toBeNull();
	});

	/*
	 * Le cœur de la décision CND : `simProduct` n'a pas de défaut. Une page dont le produit
	 * n'est pas renseigné NE DOIT PAS produire de chiffres — ils seraient plausibles et faux.
	 */
	it.each(["", "   ", "XX", "pb"])(
		"produit non renseigné ou inconnu (%j) → null, jamais de repli implicite",
		(simProduct) => {
			expect(readSimulationParamsFromPage(page({ simProduct }))).toBeNull();
		},
	);

	it.each(["PB", "CR", "RAC"])("accepte le produit %s", (simProduct) => {
		expect(readSimulationParamsFromPage(page({ simProduct }))?.product).toBe(simProduct);
	});
});

describe("readSimulationParams — depuis le contexte de rendu", () => {
	it("remonte à la page englobante depuis un contenu", () => {
		const parent = page({ simProduct: "CR", simSourceId: "NEOURL41" });
		const content = makeNode({ primaryType: "sofnt:textBlock", parent });
		expect(readSimulationParams(rcWith(content))?.sourceId).toBe("NEOURL41");
	});
});

describe("readSimulationParamsState — les trois cas à distinguer en édition", () => {
	it("option non activée → absent", () => {
		const { state, params } = readSimulationParamsState(rcWith(page({}, false)));
		expect(state).toBe("absent");
		expect(params).toBeNull();
	});

	it("option activée mais produit non renseigné → incomplete", () => {
		const { state, params } = readSimulationParamsState(rcWith(page({ simProduct: "" })));
		expect(state).toBe("incomplete");
		expect(params).toBeNull();
	});

	it("paramètres exploitables → ready", () => {
		const { state, params } = readSimulationParamsState(rcWith(page({ simProduct: "CR" })));
		expect(state).toBe("ready");
		expect(params?.product).toBe("CR");
	});
});
