import { describe, it, expect } from "vitest";
import type { FootnoteLocation } from "#lib/footnoteCollector";
import type { UnresolvedInsuranceVar } from "#lib/insuranceVars";
import {
	auditSimulationVars,
	simulationVarIssueMessage,
	simulationVarIssueHint,
} from "./auditSimulationVars";

const at = (id: string, property: string): FootnoteLocation => ({
	id,
	path: `/sites/sofinco/home/${id}`,
	property,
	label: `Bloc ${id} — ${property}`,
});

const unresolved = (
	token: string,
	reason: UnresolvedInsuranceVar["reason"],
	location: FootnoteLocation | null = null,
): UnresolvedInsuranceVar => ({ token, reason, location });

/* ────────────────────────────────────────────────────────────────────────── */

describe("auditSimulationVars", () => {
	it("rien de relevé → aucune anomalie, donc aucun bandeau", () => {
		expect(auditSimulationVars([])).toEqual([]);
	});

	/*
	 * Le point de conception le plus important de ce module : une page sans simulation rend
	 * TOUS ses jetons non résolus. Les lister un par un noierait la cause unique sous le bruit.
	 */
	it("cause de portée page → UNE seule ligne, quel que soit le nombre de jetons", () => {
		const issues = auditSimulationVars([
			unresolved("taea", "no-params", at("a", "mention")),
			unresolved("monthlyAmount", "no-params", at("a", "mention")),
			unresolved("dueNumber", "no-params", at("b", "subtitle")),
		]);

		expect(issues).toHaveLength(1);
		// 3 variables distinctes, réparties sur 2 champs seulement (a/mention en porte deux) :
		// c'est bien la variable qu'on compte, pas le champ.
		expect(issues[0]).toMatchObject({ kind: "variable", reason: "no-params", variables: 3 });
	});

	/*
	 * Le décompte porte sur la VARIABLE, pas sur le couple (variable, champ) que produit le
	 * relevé. Une même variable écrite dans trois textes reste une variable à corriger — et une
	 * seule case à cocher pour la faire fonctionner.
	 */
	it("une même variable dans plusieurs champs ne compte qu'une fois", () => {
		const issues = auditSimulationVars([
			unresolved("taea", "no-params", at("a", "mention")),
			unresolved("taea", "no-params", at("b", "subtitle")),
			unresolved("taea", "no-params", at("c", "mention")),
		]);

		expect(issues[0]).toMatchObject({ variables: 1 });
		expect(simulationVarIssueMessage(issues[0])).toContain("Une variable est utilisée");
	});

	it("la ligne de portée page ne vise aucun composant — on corrige dans les Options", () => {
		const issues = auditSimulationVars([unresolved("taea", "no-product", at("a", "mention"))]);
		expect(issues[0].location).toBeNull();
	});

	it("un jeton inconnu produit une ligne par champ, avec son repère", () => {
		const issues = auditSimulationVars([
			unresolved("tauxMagique", "unknown-token", at("a", "mention")),
			unresolved("tauxMagique", "unknown-token", at("b", "subtitle")),
		]);

		expect(issues).toHaveLength(2);
		expect(issues.map((i) => i.location?.property)).toEqual(["mention", "subtitle"]);
	});

	it("cause de page d'abord, jetons inconnus ensuite — c'est l'ordre de traitement", () => {
		const issues = auditSimulationVars([
			unresolved("tauxMagique", "unknown-token", at("a", "mention")),
			unresolved("taea", "no-params", at("b", "subtitle")),
		]);

		expect(issues.map((i) => i.reason)).toEqual(["no-params", "unknown-token"]);
	});

	it.each<[UnresolvedInsuranceVar["reason"]]>([["no-params"], ["no-product"], ["no-data"]])(
		"%s est traité comme une cause de portée page",
		(reason) => {
			const issues = auditSimulationVars([unresolved("taea", reason)]);
			expect(issues).toHaveLength(1);
			expect(issues[0].token).toBe("");
		},
	);
});

describe("simulationVarIssueMessage", () => {
	/*
	 * DEUX ÉNONCÉS, SELON CE QUE L'ON SAIT.
	 *
	 * Un jeton proche d'un nom connu est presque sûrement une coquille : on nomme le coupable
	 * probable, parce que « n'existe pas » sans plus laisse le contributeur relire la liste des
	 * quinze variables à la main. Un jeton qui ne ressemble à rien est autre chose — une
	 * variable imaginée, ou celle d'un autre système : on constate sans accuser, et on dit ce
	 * que le VISITEUR verra, qui est le vrai enjeu.
	 *
	 * Dans les deux cas l'anomalie est signalée. Filtrer sur la ressemblance ferait taire le
	 * second cas, c'est-à-dire celui qui part en production sans que personne l'ait vu.
	 */
	it("jeton proche d'un nom connu → suggère la correction", () => {
		// `taae` pour `taea` est une TRANSPOSITION — la faute de frappe la plus courante. Sur
		// quatre lettres elle vaut 2 en Levenshtein simple, hors de tout seuil raisonnable :
		// c'est exactement pour ce cas que la distance retenue est celle de Damerau.
		const [issue] = auditSimulationVars([unresolved("taae", "unknown-token")]);
		expect(simulationVarIssueMessage(issue)).toBe(
			"La variable {{taae}} n'existe pas — vouliez-vous dire {{taea}} ?",
		);
	});

	/*
	 * La casse est la seule erreur que le contributeur ne voit jamais en relisant : `{{taea}}`
	 * et `{{TAEA}}` se ressemblent, `monthlyamount` et `monthlyAmount` encore plus. La
	 * comparaison l'ignore, ce qui donne une distance nulle et une suggestion certaine.
	 */
	it("une simple différence de casse est reconnue comme telle", () => {
		const [issue] = auditSimulationVars([unresolved("monthlyamount", "unknown-token")]);
		expect(simulationVarIssueMessage(issue)).toContain("vouliez-vous dire {{monthlyAmount}} ?");
	});

	it("jeton qui ne ressemble à rien → constat, sans suggestion hasardeuse", () => {
		const [issue] = auditSimulationVars([unresolved("tauxMagique", "unknown-token")]);
		expect(simulationVarIssueMessage(issue)).toBe(
			"La variable {{tauxMagique}} n'est pas produite par le simulateur et s'affichera telle quelle",
		);
	});

	/*
	 * Les alias historiques restent RÉSOLUS pour ne pas casser le contenu importé, mais ne
	 * doivent jamais être suggérés : orienter vers `insuranceRate` plutôt que `taea` créerait
	 * de la dette éditoriale à chaque suggestion.
	 */
	it("ne suggère jamais un alias historique", () => {
		const [issue] = auditSimulationVars([unresolved("insuranceRat", "unknown-token")]);
		expect(simulationVarIssueMessage(issue)).not.toContain("insuranceRate");
	});

	it("accorde le nombre de variables touchées", () => {
		const [one] = auditSimulationVars([unresolved("taea", "no-params")]);
		expect(simulationVarIssueMessage(one)).toContain("Une variable est utilisée dans cette page");

		const [several] = auditSimulationVars([
			unresolved("taea", "no-params"),
			unresolved("dueNumber", "no-params"),
		]);
		expect(simulationVarIssueMessage(several)).toContain(
			"2 variables sont utilisées dans cette page",
		);
	});

	/*
	 * Chaque énoncé doit nommer la cause avec les mots du réglage à corriger : le contributeur
	 * lit le panneau puis doit savoir sur quel écran agir, sans traduire.
	 */
	it.each<[UnresolvedInsuranceVar["reason"], string]>([
		["no-params", "la simulation n'y est pas activée"],
		["no-product", "le type de crédit n'est pas renseigné"],
		["no-data", "n'a renvoyé aucune valeur"],
	])("%s → énoncé distinct", (reason, expected) => {
		const [issue] = auditSimulationVars([unresolved("taea", reason)]);
		expect(simulationVarIssueMessage(issue)).toContain(expected);
	});
});

describe("simulationVarIssueHint", () => {
	it("chaque motif dit QUOI FAIRE, pas seulement ce qui ne va pas", () => {
		const reasons: UnresolvedInsuranceVar["reason"][] = [
			"unknown-token",
			"no-params",
			"no-product",
			"no-data",
		];
		for (const reason of reasons) {
			const [issue] = auditSimulationVars([unresolved("taea", reason)]);
			const hint = simulationVarIssueHint(issue);
			expect(hint.length).toBeGreaterThan(40);
		}
	});

	it("le jeton inconnu oriente vers l'orthographe et la config de site", () => {
		const [issue] = auditSimulationVars([unresolved("tauxMagique", "unknown-token")]);
		expect(simulationVarIssueHint(issue)).toContain("Variables du simulateur");
	});

	it("la simulation non activée oriente vers les Options de la page", () => {
		const [issue] = auditSimulationVars([unresolved("taea", "no-params")]);
		expect(simulationVarIssueHint(issue)).toContain("Options de la page");
	});
});
