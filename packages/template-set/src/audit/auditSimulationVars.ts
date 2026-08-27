/*
 * CONTRÔLE DES VARIABLES DE SIMULATION — ANALYSE.
 *
 * Confronte les jetons `{{taea}}`, `{{monthlyAmount}}`… rencontrés à la production du texte
 * — relevés par `#lib/insuranceVars` — à ce que la page peut réellement résoudre. Fonction
 * PURE : ni DOM, ni rendu, ni état.
 *
 * POURQUOI CE CONTRÔLE EXISTE
 * ---------------------------
 * Le jeton d'une variable est en SAISIE LIBRE dans la configuration de site
 * (`sofnt:simulatorVar.token`), et il n'existe aucun moyen de le valider à la contribution :
 * seul le bridge Java sait quelles valeurs il produit, et il ne les connaît qu'au rendu d'une
 * page donnée. Un jeton inventé — ou une page où la simulation n'est pas activée — laisse
 * donc un `{{...}}` brut dans le texte publié.
 *
 * Sur des mentions d'assurance, c'est-à-dire du contenu réglementé, cela n'est pas acceptable
 * sans filet. Ce module EST ce filet : il rend l'erreur visible au contributeur, au moment où
 * il édite, avec le champ exact à corriger.
 *
 * Vit dans `src/audit/` et non dans `lib`, comme `auditFootnotes` : `lib` enregistre, `audit`
 * interprète — et la dépendance ne va que dans ce sens-là.
 */
import type { FootnoteLocation } from "#lib/footnoteCollector";
import { suggestInsuranceVarToken, type UnresolvedInsuranceVar } from "#lib/insuranceVars";

/**
 * Une seule sorte d'anomalie, contrairement aux mentions légales : le motif précis vit dans
 * `reason`. Le panneau s'en sert pour la couleur et la sévérité — un jeton non résolu est
 * toujours visible par le visiteur, donc toujours bloquant.
 */
export interface SimulationVarIssue {
	kind: "variable";
	/** Jeton concerné, ou `""` pour une anomalie de portée page. */
	token: string;
	reason: UnresolvedInsuranceVar["reason"];
	/**
	 * Nombre de variables DISTINCTES touchées — n'a de sens que pour les anomalies de portée page.
	 *
	 * Ce n'est ni un nombre de champs, ni un nombre d'occurrences. Les jetons non résolus sont
	 * relevés par couple (variable, champ) : un texte contenant {@code {{taea}}} et
	 * {@code {{monthlyAmount}}} en produit deux pour un seul champ, et {@code {{taea}}} présent
	 * dans trois textes en produit trois pour une seule variable. Annoncer « 2 champs » dans le
	 * premier cas serait faux.
	 *
	 * On retient la variable parce que c'est l'unité que le contributeur a écrite et que le
	 * visiteur verra brute : elle répond à « qu'est-ce qui ne sera pas remplacé ».
	 */
	variables: number;
	location: FootnoteLocation | null;
}

/**
 * Motifs de PORTÉE PAGE : la cause est unique et vaut pour tous les jetons de la page.
 *
 * Les lister champ par champ produirait une avalanche — dix jetons répartis dans six blocs
 * feraient soixante lignes pour un seul oubli, celui d'activer la simulation. On n'en émet
 * donc qu'une, en indiquant combien de champs sont touchés. `unknown-token`, à l'inverse,
 * désigne une faute de frappe distincte à chaque fois : elle reste détaillée.
 */
const PAGE_SCOPED: ReadonlyArray<UnresolvedInsuranceVar["reason"]> = [
	"no-params",
	"no-product",
	"no-data",
	"no-source",
];

/**
 * Regroupe les jetons non résolus en anomalies affichables.
 *
 * L'ordre est celui du traitement attendu : la cause de portée page d'abord — la corriger
 * résout tout le reste — puis les jetons inconnus, champ par champ.
 */
export const auditSimulationVars = (
	unresolved: readonly UnresolvedInsuranceVar[],
): SimulationVarIssue[] => {
	if (unresolved.length === 0) return [];

	const issues: SimulationVarIssue[] = [];

	const pageScoped = unresolved.filter((entry) => PAGE_SCOPED.includes(entry.reason));
	if (pageScoped.length > 0) {
		/*
		 * Un seul motif retenu, celui du premier relevé : les trois causes de portée page
		 * s'excluent (pas de mixin, ou mixin sans produit, ou bridge muet), la résolution étant
		 * mémorisée une fois par rendu de page.
		 */
		issues.push({
			kind: "variable",
			token: "",
			reason: pageScoped[0].reason,
			// Dédoublonné par jeton : `pageScoped` compte des couples (variable, champ).
			variables: new Set(pageScoped.map((entry) => entry.token)).size,
			// Volontairement sans repère : la correction se fait dans les Options de la PAGE,
			// pas dans le composant où le jeton a été rencontré. Y renvoyer serait trompeur.
			location: null,
		});
	}

	for (const entry of unresolved) {
		if (entry.reason !== "unknown-token") continue;
		issues.push({
			kind: "variable",
			token: entry.token,
			reason: entry.reason,
			variables: 1,
			location: entry.location,
		});
	}

	return issues;
};

/**
 * Énoncé affiché, dans les termes du contributeur : il écrit `{{taea}}` et lit « {{taea}} ».
 *
 * <p>Chaque énoncé nomme la cause AVEC LES MOTS DU RÉGLAGE à corriger — « la simulation n'y est
 * pas activée » renvoie à la case « Simulation (exemple représentatif) » des Options de la page,
 * « le type de crédit » au champ qui porte ce nom. Un énoncé qui décrirait l'état interne
 * (« la page n'a pas de paramètres de simulation ») obligerait le contributeur à traduire lui-même
 * vers l'écran où agir.
 */
export const simulationVarIssueMessage = ({
	token,
	reason,
	variables,
}: SimulationVarIssue): string => {
	if (reason === "unknown-token") {
		const suggestion = suggestInsuranceVarToken(token);
		return suggestion
			? `La variable {{${token}}} n'existe pas — vouliez-vous dire {{${suggestion}}} ?`
			: `La variable {{${token}}} n'est pas produite par le simulateur et s'affichera telle quelle`;
	}

	const scope =
		variables > 1
			? `${variables} variables sont utilisées dans cette page`
			: "Une variable est utilisée dans cette page";

	if (reason === "no-params") return `${scope}, mais la simulation n'y est pas activée`;
	if (reason === "no-product") return `${scope}, mais le type de crédit n'est pas renseigné`;
	if (reason === "no-source") return `${scope}, mais la provenance n'est pas renseignée`;
	return `${scope}, mais la simulation n'a renvoyé aucune valeur`;
};

/** Aide contextuelle : le quoi faire, pas seulement le quoi. */
export const simulationVarIssueHint = ({ reason }: SimulationVarIssue): string => {
	if (reason === "unknown-token") {
		/*
		 * L'énoncé porte déjà le constat, et la suggestion quand il y en a une. L'aide ne le
		 * répète pas : elle donne le geste, et l'endroit où vérifier la liste complète.
		 */
		return (
			"Corrigez le nom du jeton dans le texte, ou consultez la liste des variables " +
			"disponibles dans Configuration du site › Variables du simulateur. Tant qu'il est " +
			"faux, les visiteurs voient les accolades."
		);
	}
	if (reason === "no-params") {
		return (
			"Activez « Simulation (exemple représentatif) » dans les Options de la page, sinon " +
			"aucune variable de ce texte ne sera remplacée."
		);
	}
	if (reason === "no-product") {
		return (
			"La simulation est activée mais son type de crédit n'est pas renseigné : elle reste " +
			"inactive. Complétez-le dans les Options de la page."
		);
	}
	if (reason === "no-source") {
		return (
			"Les bornes de l'offre (montants, durées, taux) viennent de la campagne, identifiée " +
			"par la provenance. Renseignez « Provenance » dans les Options de la page — le type " +
			"de crédit n'est pas nécessaire pour ces variables-là."
		);
	}
	return (
		"La simulation est configurée mais n'a renvoyé aucune valeur — paramètres refusés par le " +
		"service, ou service indisponible. À signaler à l'équipe technique."
	);
};
