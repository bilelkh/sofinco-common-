import { describe, it, expect, vi } from "vitest";
import { makeNode, type PropValue } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import { buildLoanOrCredit, LOAN_PRODUCT_SCHEMA_MIXIN } from "./loanOrCredit";

const CANONICAL = "https://www.sofinco.fr/credit-pret/pret-personnel";
const INPUT = {
	name: "Prêt personnel",
	description: "Financez tous vos projets.",
	url: CANONICAL,
	id: `${CANONICAL}#loan`,
	provider: { "@id": "https://www.sofinco.fr/#organization" },
};

/**
 * Propriété NON RENSEIGNÉE sur le nœud — à distinguer d'une propriété valant `0`.
 * `makeNode` traite `undefined` comme une absence (`hasProperty` faux), exactement
 * comme le dépôt.
 */
const ABSENT = undefined as unknown as PropValue;

const productPage = (props: Record<string, PropValue> = {}, mixins = [LOAN_PRODUCT_SCHEMA_MIXIN]) =>
	makeNode({
		nodeTypes: ["jnt:page", ...mixins],
		props: {
			loanType: "Prêt personnel",
			loanAmountMin: 1000,
			loanAmountMax: 75000,
			loanTermMinMonths: 6,
			loanTermMaxMonths: 84,
			loanAprMin: 1.9,
			loanAprMax: 21.3,
			...props,
		},
	});

describe("buildLoanOrCredit", () => {
	it("émet toutes les valeurs numériques en NOMBRES, jamais en chaînes d'affichage", () => {
		const node = buildLoanOrCredit(productPage(), INPUT);

		expect(node).toEqual({
			"@type": "LoanOrCredit",
			"@id": `${CANONICAL}#loan`,
			"name": "Prêt personnel",
			"description": "Financez tous vos projets.",
			"url": CANONICAL,
			"provider": { "@id": "https://www.sofinco.fr/#organization" },
			"loanType": "Prêt personnel",
			"currency": "EUR",
			"amount": {
				"@type": "MonetaryAmount",
				"currency": "EUR",
				"minValue": 1000,
				"maxValue": 75000,
			},
			"loanTerm": {
				"@type": "QuantitativeValue",
				"minValue": 6,
				"maxValue": 84,
				"unitCode": "MON",
			},
			"annualPercentageRate": {
				"@type": "QuantitativeValue",
				"minValue": 1.9,
				"maxValue": 21.3,
				"unitText": "TAEG fixe",
			},
			"loanRepaymentForm": { "@type": "RepaymentSpecification" },
			"gracePeriod": "P14D",
		});

		const json = JSON.stringify(node);
		expect(json).toContain('"minValue":1000');
		expect(json).toContain('"maxValue":21.3');
	});

	it("publie un TAEG de 0 % au lieu de le confondre avec une valeur non saisie", () => {
		// Une offre auto ou travaux à 0 % est un argument commercial courant. Traiter
		// `0` comme « non renseigné » supprimait la borne basse et faisait annoncer un
		// TAEG minimum faux — celui du maximum.
		const node = buildLoanOrCredit(productPage({ loanAprMin: 0 }), INPUT);
		expect(node?.annualPercentageRate).toMatchObject({ minValue: 0, maxValue: 21.3 });
		expect(JSON.stringify(node)).toContain('"minValue":0');
	});

	it("n'émet qu'une borne quand l'autre n'est pas renseignée", () => {
		const node = buildLoanOrCredit(
			productPage({ loanAmountMin: ABSENT, loanTermMaxMonths: ABSENT, loanAprMin: ABSENT }),
			INPUT,
		);
		expect(node?.amount).toMatchObject({ minValue: undefined, maxValue: 75000 });
		expect(node?.loanTerm).toMatchObject({ minValue: 6, maxValue: undefined });
		expect(node?.annualPercentageRate).toMatchObject({ minValue: undefined, maxValue: 21.3 });
	});

	it("omet une plage entièrement non renseignée plutôt que de l'émettre creuse", () => {
		const node = buildLoanOrCredit(
			productPage({
				loanAmountMin: ABSENT,
				loanAmountMax: ABSENT,
				loanTermMinMonths: ABSENT,
				loanTermMaxMonths: ABSENT,
				loanAprMin: ABSENT,
				loanAprMax: ABSENT,
			}),
			INPUT,
		);
		expect(node?.amount).toBeUndefined();
		expect(node?.loanTerm).toBeUndefined();
		expect(node?.annualPercentageRate).toBeUndefined();
		// Le nœud reste émis : loanType et provider suffisent à décrire l'offre.
		expect(node?.loanType).toBe("Prêt personnel");
	});

	it("distingue une plage à zéro d'une plage absente", () => {
		const zero = buildLoanOrCredit(productPage({ loanAprMin: 0, loanAprMax: 0 }), INPUT);
		expect(zero?.annualPercentageRate).toMatchObject({ minValue: 0, maxValue: 0 });
	});

	it("n'émet rien sans le mixin — c'est ce qui rend le schema opt-in", () => {
		expect(buildLoanOrCredit(productPage({}, []), INPUT)).toBeNull();
	});

	it("n'émet rien sans type de prêt, sans nom, ni sans page", () => {
		expect(buildLoanOrCredit(productPage({ loanType: "" }), INPUT)).toBeNull();
		expect(buildLoanOrCredit(productPage(), { ...INPUT, name: "" })).toBeNull();
		expect(buildLoanOrCredit(null, INPUT)).toBeNull();
	});
});
