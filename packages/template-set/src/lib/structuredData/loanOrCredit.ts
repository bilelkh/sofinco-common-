import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { JsonLdNode, JsonLdRef } from "./types";
import { getDouble, hasMixin, num, str } from "#lib/jcr";

/**
 * `LoanOrCredit` des pages produit, construit depuis le mixin
 * `sofmix:loanProductSchema` porté par la page.
 *
 * Le mixin est opt-in : son absence suffit à ne pas émettre le nœud, sans drapeau
 * de désactivation supplémentaire. Il vit sur la PAGE et non sur le bloc « exemple
 * représentatif » parce que les valeurs décrivent l'offre entière (plages de
 * montant, de durée et de TAEG), là où l'exemple représentatif n'en illustre qu'un
 * point.
 *
 * Toutes les valeurs numériques sortent en NOMBRES. L'émetteur qu'il remplace (le
 * `<script>` inline de `RepresentativeExample.tsx`) publiait des chaînes
 * d'affichage — `"3 000 €"` comme montant, `"4,6"` comme TAEG — que schema.org
 * n'interprète pas.
 */
export const LOAN_PRODUCT_SCHEMA_MIXIN = "sofmix:loanProductSchema";

/** Délai légal de rétractation d'un crédit à la consommation : 14 jours. */
const GRACE_PERIOD = "P14D";

/** Unité UN/CEFACT des mois, attendue par `QuantitativeValue.unitCode`. */
const MONTH_UNIT_CODE = "MON";

export interface LoanOrCreditInput {
	/** Titre résolu de la page — le même que `<title>` et `og:title`. */
	name: string;
	/** Description résolue de la page — la même que `<meta name="description">`. */
	description: string;
	/** URL publique de la page. */
	url: string;
	id: string;
	/** Renvoi vers l'`Organization` du graphe, `undefined` quand elle n'est pas émise. */
	provider: JsonLdRef | undefined;
}

/**
 * Lecture d'une valeur numérique FACULTATIVE : `NaN` quand la propriété est absente.
 *
 * `num()` et `getDouble()` retombent sur `0` par défaut, ce qui rend « non
 * renseigné » indiscernable de « vaut zéro ». Sur un site de crédit la nuance est
 * commerciale : une offre auto ou travaux à **0 % TAEG** est un argument de vente
 * courant, et la traiter comme absente publiait un TAEG minimum faux — celui du
 * maximum, ou rien du tout. `NaN` ne peut pas être saisi, donc il marque l'absence
 * sans ambiguïté et se teste avec `Number.isFinite`.
 */
const optLong = (node: JCRNodeWrapper, property: string): number => num(node, property, NaN);
const optDouble = (node: JCRNodeWrapper, property: string): number =>
	getDouble(node, property, NaN);

/**
 * Construit un `QuantitativeValue` borné, ou `undefined` quand aucune des deux
 * bornes n'est renseignée — une plage vide n'a pas de sens et déclencherait une
 * erreur de validation.
 */
const range = (
	min: number,
	max: number,
	extra: { unitCode?: string; unitText?: string },
): JsonLdNode | undefined => {
	const hasMin = Number.isFinite(min);
	const hasMax = Number.isFinite(max);
	if (!hasMin && !hasMax) return undefined;
	return {
		"@type": "QuantitativeValue",
		"minValue": hasMin ? min : undefined,
		"maxValue": hasMax ? max : undefined,
		...extra,
	};
};

export const buildLoanOrCredit = (
	pageNode: JCRNodeWrapper | null | undefined,
	{ name, description, url, id, provider }: LoanOrCreditInput,
): JsonLdNode | null => {
	if (!pageNode) return null;
	if (!hasMixin(pageNode, LOAN_PRODUCT_SCHEMA_MIXIN)) return null;

	const loanType = str(pageNode, "loanType").trim();
	if (!loanType || !name) return null;

	const amountMin = optLong(pageNode, "loanAmountMin");
	const amountMax = optLong(pageNode, "loanAmountMax");
	const hasAmountMin = Number.isFinite(amountMin);
	const hasAmountMax = Number.isFinite(amountMax);

	return {
		"@type": "LoanOrCredit",
		"@id": id,
		"name": name,
		"description": description || undefined,
		"url": url || undefined,
		"provider": provider,
		"loanType": loanType,
		"currency": "EUR",
		"amount":
			hasAmountMin || hasAmountMax
				? {
						"@type": "MonetaryAmount",
						"currency": "EUR",
						"minValue": hasAmountMin ? amountMin : undefined,
						"maxValue": hasAmountMax ? amountMax : undefined,
					}
				: undefined,
		"loanTerm": range(
			optLong(pageNode, "loanTermMinMonths"),
			optLong(pageNode, "loanTermMaxMonths"),
			{ unitCode: MONTH_UNIT_CODE },
		),
		"annualPercentageRate": range(
			optDouble(pageNode, "loanAprMin"),
			optDouble(pageNode, "loanAprMax"),
			{ unitText: "TAEG fixe" },
		),
		// Crédit amortissable classique : remboursement par mensualités constantes.
		// `loanRepaymentForm` attend un `RepaymentSpecification`, pas une chaîne —
		// une valeur textuelle est signalée par les validateurs et ne porte aucune
		// information exploitable. Les montants d'échéance dépendent du montant et de
		// la durée choisis, donc seul le type est déclaré ici.
		"loanRepaymentForm": { "@type": "RepaymentSpecification" },
		"gracePeriod": GRACE_PERIOD,
	};
};
