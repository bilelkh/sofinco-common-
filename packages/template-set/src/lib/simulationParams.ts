/*
 * Lecture du mixin de page `sofmix:simulationParams`.
 *
 * Ce mixin est la source unique des paramètres de simulation d'une page. Trois
 * consommateurs :
 *   1. le filtre `sofinco-core`, qui calcule l'exemple et le pose en attribut de requête ;
 *   2. `simulatorCta.ts`, qui s'en sert de repli quand un CTA ne renseigne pas son produit
 *      ou son sourceId (même convention que `idcatorigin` → `eaPageOptions.idcat`) ;
 *   3. la vue d'édition de `RepresentativeExample`, qui affiche les valeurs héritées.
 *
 * `insuranceVars.ts` ne passe PAS par ici : il est importé par `jcr.ts`, dont ce module
 * dépend — l'import créerait un cycle. Il fait ses propres lectures brutes, cf. son en-tête.
 */

import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import { str, num, getCurrentPageNode } from "./jcr";

/** Nom du mixin, partagé avec `insuranceVars.ts` et le filtre Java. */
export const SIMULATION_PARAMS_MIXIN = "sofmix:simulationParams";

/**
 * Valeurs affichées quand la page ne fixe ni montant ni durée.
 *
 * Miroir des défauts de `sofnt:representativeExampleConfig` — le nœud de config de site que
 * `RepresentativeExampleServiceImpl` consulte quand la page est muette. Ce module ne pilote
 * AUCUN appel APIM : il alimente l'aperçu en édition, et doit donc montrer ce que le rendu
 * utilisera réellement. Les désaligner ferait mentir l'aperçu.
 *
 * Ces deux valeurs sont les seules rondes valides pour les TROIS produits — 5 000 € tient dans
 * l'enveloppe du CR (150–10 000) comme dans celles du PB et du RAC (3 001–75 000 / 100 000), et
 * 48 mois sort du plancher exact du RAC sans dépasser le plafond du CR. Verrouillé côté Java
 * par `CampaignConsistencyTest#siteDefaultsStayValidForEveryProduct`.
 */
export const SIMULATION_DEFAULT_AMOUNT = 5000;
export const SIMULATION_DEFAULT_DURATION = 48;

/** Types de crédit acceptés par la choicelist `simProduct`. */
export type SimulationProduct = "PB" | "CR" | "RAC";

export interface SimulationParams {
	/**
	 * Type de crédit. Jamais vide quand `readSimulationParams` renvoie un objet : une page
	 * dont le produit n'est pas renseigné est traitée comme n'ayant pas de simulation, pour
	 * ne jamais produire de chiffres calculés sur le mauvais type de crédit.
	 */
	product: SimulationProduct;
	amount: number;
	duration: number;
	scaleCode: string;
	sourceId: string;
}

/** Vrai si la page porte le mixin — sans exiger que le produit soit renseigné. */
export function hasSimulationParams(page: JCRNodeWrapper | null): boolean {
	if (!page) return false;
	try {
		return page.isNodeType(SIMULATION_PARAMS_MIXIN);
	} catch {
		return false;
	}
}

const isProduct = (value: string): value is SimulationProduct =>
	value === "PB" || value === "CR" || value === "RAC";

/**
 * Lit les paramètres de simulation d'une page.
 *
 * @returns `null` si la page ne porte pas le mixin, ou si `simProduct` n'est pas renseigné /
 *   n'est pas une valeur connue. Dans les deux cas la simulation est considérée inactive.
 */
export function readSimulationParamsFromPage(page: JCRNodeWrapper | null): SimulationParams | null {
	if (!hasSimulationParams(page) || !page) return null;

	const product = str(page, "simProduct");
	if (!isProduct(product)) return null;

	return {
		product,
		amount: num(page, "simAmount", SIMULATION_DEFAULT_AMOUNT),
		duration: num(page, "simDuration", SIMULATION_DEFAULT_DURATION),
		scaleCode: str(page, "simScaleCode"),
		sourceId: str(page, "simSourceId"),
	};
}

/** Idem, en repartant de la page courante du contexte de rendu. */
export function readSimulationParams(renderContext: RenderContext): SimulationParams | null {
	return readSimulationParamsFromPage(getCurrentPageNode(renderContext));
}

/**
 * État du mixin sur la page courante, pour les vues d'édition et le panneau d'audit.
 *
 * Distingue les trois cas que le contributeur doit pouvoir différencier :
 *   - `absent`      : option non activée dans les Options de la page ;
 *   - `incomplete`  : option activée mais type de crédit non renseigné ;
 *   - `ready`       : paramètres exploitables.
 */
export type SimulationParamsState = "absent" | "incomplete" | "ready";

export function readSimulationParamsState(renderContext: RenderContext): {
	state: SimulationParamsState;
	params: SimulationParams | null;
} {
	const page = getCurrentPageNode(renderContext);
	if (!hasSimulationParams(page)) return { state: "absent", params: null };

	const params = readSimulationParamsFromPage(page);
	return params ? { state: "ready", params } : { state: "incomplete", params: null };
}
