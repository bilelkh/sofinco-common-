/*
 * VARIABLES DE SIMULATION DANS LES TEXTES CONTRIBUTEUR — côté serveur.
 *
 * Un contributeur écrit `{{taea}}` dans n'importe quel richtext ; la valeur réelle est
 * substituée au rendu. La substitution a lieu dans `str()` (lib/jcr.ts), passage obligé de
 * tout texte contributeur — donc AUCUN composant n'a à s'en occuper.
 *
 */

import { server, useServerContext } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { getRequestAttribute } from "./renderContext";
import { readFootnoteLocation, type FootnoteLocation } from "./footnoteCollector";
import { readString, type JavaRecord } from "./javaBridge";

/* ──────────────────────────────────────────────────────────────────────────
   Contrat avec le filtre Java
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Attribut de requête posé par le filtre `sofinco-core` en phase `prepare`, quand la page
 * courante porte `sofmix:simulationParams` avec un `simProduct` renseigné.
 *
 * Le filtre y place le `JavaRecord` calculé (même forme que le retour de
 * `RepresentativeExampleBridge.getExample`) ou un porteur paresseux exposant la même donnée.
 * Tant que le filtre n'est pas déployé, ce module retombe sur l'appel direct au service OSGi
 * (cf. `resolveFromBridge`) : le comportement est identique, seul le nombre d'appels change.
 */
export const SIMULATION_REQUEST_ATTRIBUTE = "sofinco.simulation";

/**
 * Attribut portant les variables de CAMPAGNE — l'enveloppe commerciale de la provenance.
 *
 * Deuxième porteur, indépendant du précédent : une page qui n'utilise que `{minAmount}` ne doit
 * déclencher aucun appel de simulation, et réciproquement. Les deux familles n'ont d'ailleurs pas
 * les mêmes préconditions — une campagne se contente de `simSourceId`, là où une simulation exige
 * aussi le type de crédit.
 */
export const CAMPAIGN_REQUEST_ATTRIBUTE = "sofinco.campaign";

/** Nom du mixin de page portant les paramètres de simulation. */
export const SIMULATION_PARAMS_MIXIN = "sofmix:simulationParams";

const REPRESENTATIVE_EXAMPLE_BRIDGE = "ch.sofinco.core.bridge.RepresentativeExampleBridge";

interface BridgeLike {
	getExample(node: JCRNodeWrapper): JavaRecord | null;
}

/* ──────────────────────────────────────────────────────────────────────────
   Jetons canoniques
   ────────────────────────────────────────────────────────────────────────── */

export const INSURANCE_VAR_TOKENS = [
	// Communs.
	"exampleAmount",
	"dueNumber",
	"dueNumberMinusOne",
	// Hors assurance — présents même sur une offre sans assurance facultative.
	"taeg",
	"debitRate",
	"monthlyWithoutInsurance",
	"lastWithoutInsurance",
	"totalWithoutInsurance",
	// Assurance emprunteur.
	"taea",
	"monthlyAmount",
	"firstMonthlyAmount",
	"totalInsuranceCost",
	"monthlyWithInsurance",
	"lastWithInsurance",
	"totalWithInsurance",
] as const;

export type InsuranceVarToken = (typeof INSURANCE_VAR_TOKENS)[number];

/**
 * Jetons de CAMPAGNE — bornes de l'offre, par opposition au résultat d'un exemple calculé.
 *
 * <p>Ils décrivent ce que le produit AUTORISE : « un TAEG fixe de 4,4 % à 15,65 %, pour un montant
 * de 3 001 € à 75 000 € ». Une simulation, elle, calcule UNE valeur pour UN jeu de paramètres —
 * aucun appel `calculate` ne peut produire une fourchette.
 *
 * `id`, `type` et `label` sont renvoyés par l'APIM mais volontairement absents : les deux premiers
 * sont techniques, et `label` est un nom bien trop générique pour un espace de jetons partagé avec
 * les gabarits d'autres modules.
 *
 * Les durées sont des NOMBRES NUS : les mentions écrivent « de {minDuration} à {maxDuration} mois »,
 * le mot appartient à la phrase du contributeur. L'inclure produirait « 120 mois mois ».
 */
export const CAMPAIGN_VAR_TOKENS = [
	// Bornes de montant.
	"minAmount",
	"maxAmount",
	// Bornes de durée, en mois.
	"minDuration",
	"maxDuration",
	// Bornes de taux.
	"minAnnualDebitRate",
	"maxAnnualDebitRate",
	"minAnnualGlobalEffectiveRate",
	"maxAnnualGlobalEffectiveRate",
	"promoGlobalEffectiveRate",
	// Validité commerciale de l'offre.
	"startDate",
	"endDate",
] as const;

export type CampaignVarToken = (typeof CAMPAIGN_VAR_TOKENS)[number];

/**
 * Valeurs renvoyées par le bridge — la table reste OUVERTE : toute clé du record y entre, sans
 * mise en correspondance à écrire ni type à étendre.
 *
 * <p>Sa RÉSOLUTION, elle, est fermée depuis que les deux familles coexistent : un jeton absent
 * de {@code INSURANCE_VAR_TOKENS} et de {@code CAMPAIGN_VAR_TOKENS} n'interroge aucun service,
 * pour qu'une faute de frappe ne coûte pas un appel APIM. Ajouter une variable côté Java demande
 * donc UNE ligne ici — la déclarer dans la liste — et rien d'autre.
 */
export type InsuranceVarSource = Record<string, string | undefined>;

/**
 * Alias historiques → jeton canonique.
 *
 * Ils proviennent du site legacy et restent reconnus : des milliers de mentions publiées les
 * utilisent. On n'en ajoute plus, on se contente de ne pas casser l'existant — ils ne sont
 * donc jamais proposés dans le menu d'insertion.
 */
const LEGACY_ALIASES: Record<string, string> = {
	// Communs.
	amount: "exampleAmount",
	montant: "exampleAmount",
	dueNumberMinus1: "dueNumberMinusOne",
	dueNumberWithoutLast: "dueNumberMinusOne",
	mois: "dueNumber",
	// Assurance emprunteur.
	monthlyInsuranceAmountT1: "monthlyAmount",
	/*
	 * PREMIÈRE prime, pas la prime courante. Le nom le dit — « first » — et l'ancien site
	 * l'employait dans la formule « la première prime est la plus élevée soit X ». Le faire
	 * pointer sur `monthlyAmount` afficherait la prime courante : identique aujourd'hui, faux le
	 * jour où l'APIM distinguera les deux, ce qui est le propre d'une prime dégressive.
	 */
	firstMonthlyInsuranceAmountT1: "firstMonthlyAmount",
	annualInsuranceEffectiveRate: "taea",
	insuranceRate: "taea",
	totalInsuranceAmountT1: "totalInsuranceCost",
	monthlyAmountWithInsurance: "monthlyWithInsurance",
	monthlyAmountWitInsurance: "monthlyWithInsurance",
	lastMonthlyAmountWithInsurance: "lastWithInsurance",
	/*
	 * HORS ASSURANCE — vocabulaire relevé dans `exempleCr` du simulateur Vue de l'ancien site
	 * (sofinco_project/portal-simulation/src/assets/i18n/message.json). Ces jetons figurent dans
	 * des mentions déjà publiées ; sans ces alias, une reprise de contenu les afficherait bruts.
	 */
	annualDebitRate: "debitRate",
	monthlyAmountNonInsurance: "monthlyWithoutInsurance",
	lastMonthlyAmountNonInsurance: "lastWithoutInsurance",
	totalAmountNonInsurance: "totalWithoutInsurance",
};

/**
 * Table jeton → valeur.
 *
 * PASSE-PLAT : toutes les clés de `source` deviennent des jetons. C'est ce qui rend le jeu de
 * variables extensible depuis Java seul — la contrainte réelle a toujours été « le bridge
 * sait-il calculer cette valeur », jamais une liste déclarée ici. Les alias legacy sont
 * ajoutés par-dessus, sans jamais écraser une clé native de même nom.
 */
export function buildInsuranceVarMap(source: InsuranceVarSource): Record<string, string> {
	const map: Record<string, string | undefined> = { ...source };

	for (const alias of Object.keys(LEGACY_ALIASES)) {
		if (map[alias] === undefined) map[alias] = source[LEGACY_ALIASES[alias]];
	}

	// Les clés sans valeur sont retirées : `map[key] ?? full` doit laisser le jeton VISIBLE
	// plutôt que d'insérer du vide. Une mention d'assurance amputée d'un chiffre est pire
	// qu'une mention affichant un jeton — la première passe inaperçue.
	const clean: Record<string, string> = {};
	for (const key of Object.keys(map)) {
		const value = map[key];
		if (value !== undefined && value !== "") clean[key] = value;
	}
	return clean;
}

/* ──────────────────────────────────────────────────────────────────────────
   Registre à portée page
   ────────────────────────────────────────────────────────────────────────── */

/** Jeton rencontré pendant le rendu et non résolu — alimente le panneau d'audit. */
export interface UnresolvedInsuranceVar {
	/** Jeton tel qu'écrit, ex. `"taea"`. */
	token: string;
	/** Pourquoi il n'a pas été résolu. */
	reason: "no-params" | "no-product" | "no-data" | "no-source" | "unknown-token";
	/**
	 * Composant et propriété où corriger, quand ils sont connus.
	 *
	 * Repris de `footnoteCollector` : `str()` pose déjà ce repère avant d'appeler la
	 * substitution, il n'y a donc rien à capturer de nouveau. Toujours `null` hors mode
	 * édition, où la collecte est inerte.
	 */
	location: FootnoteLocation | null;
}

let armed = false;
/**
 * Faux en mode ÉDITION : les jetons restent visibles et RIEN n'est résolu — donc aucun appel
 * APIM. Le contrôle, lui, continue : il devient statique (cf. `auditStatically`).
 */
let resolving = true;
/**
 * Tables résolues, UNE PAR FAMILLE — `undefined` tant que la famille n'a pas été sollicitée.
 *
 * C'est ce qui donne son sens aux deux porteurs posés par le filtre. Une table fusionnée,
 * construite d'un bloc, énumérerait les clés du porteur de simulation pour bâtir la carte — et
 * cette énumération EST la résolution, donc l'appel APIM. Un texte ne contenant qu'un
 * `{minAmount}` déclencherait alors un calcul d'exemple représentatif que la page n'affiche pas.
 *
 * Résoudre à la demande rend la paresse effective jusqu'au bout : la famille non sollicitée n'est
 * jamais touchée, et un jeton inventé ne résout rien du tout.
 */
let varsSource: JavaRecord | null = null;
let simulationVars: Record<string, string> | null | undefined;
/** `undefined` = pas encore resolu pour ce rendu. Jamais `null` : `readCampaignVars` rend `{}`. */
let campaignVars: Record<string, string> | undefined;
/** Porteur dont `campaignVars` a été tiré — pendant de `varsSource`, voir `resolveCampaignVars`. */
let campaignSource: JavaRecord | null = null;
/**
 * Attribut portant le repli bridge pour la requête en cours.
 *
 * Volontairement stocké sur la REQUÊTE et non en portée module : l'empreinte de rendu est le
 * chemin de la page, donc deux requêtes successives sur la même page partagent la même
 * empreinte et un mémo de module figerait les chiffres publiés jusqu'au prochain rendu d'une
 * autre page dans ce contexte GraalVM. La requête, elle, est neuve par construction.
 *
 * Même contrat que `SIMULATION_REQUEST_ATTRIBUTE` posé par le filtre Java — c'est le repli qui
 * s'aligne sur le mécanisme définitif, pas l'inverse.
 */
const BRIDGE_RECORD_ATTRIBUTE = "sofincoSimulationBridgeRecord";
/** État de la page, lu du seul JCR et mémorisé — alimente le contrôle statique. */
/**
 * Verdict par FAMILLE, memorise par rendu.
 *
 * Deux verdicts et non un seul : les preconditions different — la simulation exige le type de
 * credit, la campagne se contente de la provenance. Un verdict unique dirigeait forcement l'un
 * des deux vers le mauvais champ.
 */
interface PageState {
	simulation: "ready" | "no-params" | "no-product";
	campaign: "ready" | "no-params" | "no-source";
}

let pageState: PageState | null = null;
let unresolved = new Map<string, UnresolvedInsuranceVar>();
let lastReason: UnresolvedInsuranceVar["reason"] = "no-params";

/** Ressource principale pour laquelle l'état courant a été posé. Voir {@link ensureCurrentRender}. */
let renderKey = "";

/**
 * Empreinte du rendu courant : chemin de la ressource principale, ou `""` si indisponible.
 */
function currentRenderKey(): string {
	try {
		const { renderContext } = useServerContext();
		const node = renderContext.getMainResource().getNode() as { getPath?: () => string } | null;
		return typeof node?.getPath === "function" ? node.getPath() : "";
	} catch {
		return "";
	}
}

/**
 * Garde-fou contre la réutilisation des contextes JS entre requêtes.
 *
 * Le moteur de Jahia gère ses contextes GraalVM dans un pool : l'état de module survit d'une
 * requête à l'autre. Or `startInsuranceVars` n'est appelé que par `Layout` — et `Layout` NE
 * tourne pas quand le fragment de page vient du cache et que l'agrégation ne re-rend qu'un
 * sous-fragment isolé (leurs durées d'inactivité sont indépendantes, cf. `HTMLCache`
 * `timeToIdleSeconds=1800`).
 *
 * Sans ce contrôle, ce sous-fragment substituerait avec les données laissées par la requête
 * précédente — donc, potentiellement, les chiffres d'une AUTRE page — et le résultat partirait
 * en cache sous une clé pourtant correcte. Des chiffres réglementés faux, durablement mémorisés.
 *
 * Le mode édition n'est pas concerné : le cache de fragments y est inactif, `Layout` tourne
 * toujours, et `renderKey` correspond donc déjà. On peut sans risque repartir en mode résolvant.
 */
function ensureCurrentRender(): void {
	const key = currentRenderKey();
	if (key === renderKey) return;
	renderKey = key;
	armed = true;
	resolving = true;
	varsSource = null;
	campaignSource = null;
	simulationVars = undefined;
	campaignVars = undefined;
	pageState = null;
	unresolved = new Map();
	lastReason = "no-params";
}

/**
 * (Ré)arme le registre pour un rendu de page. Appelé par `Layout`, avant les descendants.
 *
 * Indispensable : l'état de module persiste d'une requête à l'autre dans le moteur JS de
 * Jahia. C'est le même contrat que `startFootnoteCollection`.
 *
 * @param resolve `false` en mode ÉDITION. Les jetons restent alors affichés tels quels et
 *   AUCUN appel APIM n'est émis — une session d'édition recharge le Page Builder en continu
 *   (sauvegarde, glisser-déposer, ouverture de panneau) et n'a aucune raison de solliciter un
 *   service bancaire externe à chaque fois. Le contributeur relit en prime ses propres jetons,
 *   ce qui est le seul moment où il peut vérifier qu'il ne s'est pas trompé.
 *
 *   Le CONTRÔLE, lui, reste actif : il devient statique (`auditStatically`) et détecte à la
 *   fois les jetons inexistants et l'absence de simulation sur la page — sans rien résoudre.
 *   Pour voir les valeurs réelles, le contributeur dispose du mode Aperçu, qui est fait pour ça.
 */
export const startInsuranceVars = (resolve: boolean = true): void => {
	renderKey = currentRenderKey();
	armed = true;
	resolving = resolve;
	varsSource = null;
	campaignSource = null;
	simulationVars = undefined;
	campaignVars = undefined;
	pageState = null;
	unresolved = new Map();
	lastReason = "no-params";
};

/**
 * Désarme le registre — utilisé par les tests et les rendus hors page (flux, JSON views)
 * où aucune substitution n'a de sens.
 */
export const stopInsuranceVars = (): void => {
	renderKey = currentRenderKey();
	armed = false;
	resolving = true;
	varsSource = null;
	campaignSource = null;
	simulationVars = undefined;
	campaignVars = undefined;
	pageState = null;
	unresolved = new Map();
};

/** Jetons rencontrés et non résolus pendant le rendu, dédupliqués. */
export const readUnresolvedInsuranceVars = (): UnresolvedInsuranceVar[] => [...unresolved.values()];

/**
 * Contrôle STATIQUE des jetons d'un texte, sans rien résoudre.
 *
 * Pendant du contrôle des renvois de note, pour les variables. En édition, le registre est armé
 * sans résolution : le contributeur relit ses jetons bruts, mais plus rien ne détecte ceux qui
 * sont fautifs — cette fonction rétablit la détection sans réintroduire d'appel APIM.
 *
 * Ne signale que les jetons dont on sait de façon CERTAINE qu'ils n'existent pas : ceux absents
 * à la fois des jetons documentés et des alias historiques. Un jeton connu mais qu'un bridge
 * muet ne renverrait pas n'est pas signalé ici — c'est le rendu live qui le détectera, avec le
 * motif approprié. Mieux vaut ne rien dire que d'accuser à tort un jeton valide.
 *
 * Alimente le panneau d'audit et renvoie la liste, pour un affichage au plus près du champ.
 */
export function collectUnknownInsuranceVars(text: string): string[] {
	if (!text) return [];
	ensureCurrentRender();

	const unknownTokens: string[] = [];
	for (const [, token] of text.matchAll(ANY_TOKEN)) {
		if (isKnownToken(token)) continue;
		if (unknownTokens.includes(token)) continue;
		unknownTokens.push(token);
		note(token, "unknown-token");
	}
	return unknownTokens;
}

/**
 * Jetons de la PLATEFORME Jahia, jamais les nôtres.
 *
 * Ils viennent des LIENS INTERNES. Jahia construit ses URL sur le motif
 * `/cms/{mode}/{workspace}/{lang}/…` et ne les résout qu'au rendu — cf. le commentaire de
 * `MentionLegalItem/default.server.tsx` à propos de `buildNodeUrl`. Un contributeur qui insère
 * un lien vers une autre page du site fait donc entrer ces jetons dans le richtext, et `str()`
 * les croise au même titre que le texte qui les entoure.
 *
 * LES DEUX FORMES SONT COUVERTES. La substitution capture le nom aussi bien dans `{lang}` que
 * dans `{{lang}}`, et la garde porte sur ce nom : peu importe le nombre d'accolades que la
 * source a produites. C'est nécessaire — le panneau d'audit a signalé des `{{lang}}` en
 * doubles accolades, là où le motif d'URL documenté de Jahia n'en porte qu'une.
 *
 * Cet ensemble est BORNÉ : il appartient à la plateforme et ne bouge qu'avec une version
 * majeure de Jahia. C'est ce qui rend une liste fermée acceptable ici, alors qu'elle ne le
 * serait pas pour des jetons de tiers, dont on ne peut pas prévoir le vocabulaire.
 */
const JAHIA_URL_TOKENS = ["workspace", "lang", "mode"] as const;

/**
 * Jetons d'un autre gabarit DU SITE.
 *
 * `min` / `max` sont les bornes du champ montant, substituées côté React par `SimulatorForm`
 * à partir de `minErrorMessage` / `maxErrorMessage` (`sofmix:simulatorAmount`). Le contributeur
 * les saisit lui-même : l'aide contributeur les documente comme la syntaxe attendue.
 */
const SITE_TEMPLATE_TOKENS = ["min", "max"] as const;

/**
 * Jetons appartenant à d'AUTRES moteurs, que celui-ci doit ignorer.
 *
 * `str()` applique la substitution à TOUTE propriété chaîne, pas seulement aux mentions
 * d'assurance : elle croise donc des accolades qui ne lui sont pas destinées.
 *
 * DEUX EFFETS, ET LE SECOND EST LE PLUS IMPORTANT.
 *
 * Ne pas les signaler évite d'accuser un contributeur dont le contenu est correct. Mais
 * surtout, ne JAMAIS les substituer protège ces moteurs d'une collision : `buildInsuranceVarMap`
 * reprend toutes les clés du record renvoyé par le bridge — c'est ce qui permet d'ajouter une
 * variable côté Java sans toucher à ce fichier. Le jour où le mapper émettrait une clé nommée
 * `lang`, l'URL Jahia serait réécrite et le lien casserait, sans que rien ne le signale.
 * L'ouverture aux clés inconnues exige cette contrepartie, comme `STRUCTURAL_RECORD_KEYS`.
 *
 * N'y inscrire qu'un jeton RÉELLEMENT porté par un autre moteur : cette liste ferme la
 * détection, un nom ajouté à tort masquerait une vraie faute de frappe. Elle ne traite QUE les
 * vocabulaires bornés — pour les jetons de tiers, non bornés par nature, c'est le périmètre des
 * champs audités qui est le bon levier, pas leurs noms.
 */
const RESERVED_TOKENS: ReadonlySet<string> = new Set<string>([
	...JAHIA_URL_TOKENS,
	...SITE_TEMPLATE_TOKENS,
]);

/** Vrai si le jeton appartient à un autre moteur : ni substitué, ni signalé. */
function isReservedToken(token: string): boolean {
	return RESERVED_TOKENS.has(token);
}

/**
 * Distance de Damerau-Levenshtein — Levenshtein PLUS la transposition de deux caractères
 * adjacents.
 *
 * La transposition n'est pas un raffinement académique : c'est la faute de frappe la plus
 * courante, et sur des noms courts elle décide de tout. `taae` pour `taea` vaut 2 en
 * Levenshtein simple — au-delà de tout seuil raisonnable pour un jeton de quatre lettres —
 * et 1 ici. Sans elle, la suggestion manquerait précisément le cas qu'elle existe pour
 * attraper.
 */
function damerauLevenshtein(a: string, b: string): number {
	const rows = a.length + 1;
	const cols = b.length + 1;
	const d: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

	for (let i = 0; i < rows; i++) d[i][0] = i;
	for (let j = 0; j < cols; j++) d[0][j] = j;

	for (let i = 1; i < rows; i++) {
		for (let j = 1; j < cols; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
				d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
			}
		}
	}
	return d[a.length][b.length];
}

/**
 * Tolérance admise, fonction de la longueur du jeton.
 *
 * Une distance fixe traiterait `taea` et `monthlyWithoutInsurance` de la même façon : deux
 * caractères d'écart sur quatre lettres désignent un autre mot, sur vingt-trois une coquille.
 */
function suggestionThreshold(length: number): number {
	if (length <= 5) return 1;
	if (length <= 9) return 2;
	return 3;
}

/**
 * Jeton canonique le plus proche, ou `null` si rien ne l'est assez.
 *
 * DEUX PARTIS PRIS.
 *
 * On ne suggère QUE parmi les jetons documentés, jamais parmi les alias historiques : ces
 * derniers restent résolus pour ne pas casser le contenu importé, mais orienter un
 * contributeur vers `insuranceRate` plutôt que `taea` créerait de la dette éditoriale à
 * chaque suggestion.
 *
 * La comparaison ignore la casse, et une simple différence de casse l'emporte donc sur tout
 * le reste — `{{monthlyamount}}` a une distance nulle avec `monthlyAmount`. C'est la seconde
 * erreur la plus fréquente après la transposition, et la seule que le contributeur ne voit
 * jamais en relisant.
 */
export function suggestInsuranceVarToken(token: string): string | null {
	const needle = token.toLowerCase();
	const limit = suggestionThreshold(needle.length);

	let best: string | null = null;
	let bestDistance = Number.POSITIVE_INFINITY;

	for (const candidate of INSURANCE_VAR_TOKENS) {
		const distance = damerauLevenshtein(needle, candidate.toLowerCase());
		if (distance < bestDistance) {
			bestDistance = distance;
			best = candidate;
		}
	}

	return best !== null && bestDistance <= limit ? best : null;
}

/** Vrai si le jeton figure parmi les jetons documentés ou les alias historiques. */
function isKnownToken(token: string): boolean {
	return (
		INSURANCE_VAR_TOKENS.includes(token as InsuranceVarToken) ||
		LEGACY_ALIASES[token] !== undefined ||
		isCampaignToken(token)
	);
}

/**
 * Vrai si le jeton appartient à la famille CAMPAGNE.
 *
 * Les deux vocabulaires sont disjoints — vérifié par test — ce qui permet de les fusionner dans
 * une seule table de substitution. Mais le MOTIF d'échec, lui, diffère : un `{{taea}}` non résolu
 * renvoie au type de crédit de la page, un `{minAmount}` à sa provenance. Sans cette distinction,
 * le panneau enverrait le contributeur sur le mauvais champ.
 */
function isCampaignToken(token: string): boolean {
	return CAMPAIGN_VAR_TOKENS.includes(token as CampaignVarToken);
}

/**
 * Contrôle du mode ÉDITION : diagnostique sans jamais résoudre.
 *
 * Deux familles d'anomalies, toutes deux détectables sans le service :
 *   - le jeton n'existe pas — faute de frappe, il s'afficherait brut aux visiteurs ;
 *   - le jeton existe, mais la page n'a pas de simulation exploitable, donc il ne serait
 *     résolu nulle part.
 *
 * Un jeton connu sur une page correctement configurée n'est pas signalé : ce qui pourrait
 * encore échouer — un service muet — ne se constate qu'au rendu live, avec son propre motif.
 */
function auditStatically(text: string): void {
	const state = readPageState();
	for (const [, token] of text.matchAll(ANY_TOKEN)) {
		if (isReservedToken(token)) continue;
		if (!isKnownToken(token)) {
			note(token, "unknown-token");
			continue;
		}
		// Chaque jeton est jugé sur les préconditions de SA famille : le panneau nomme donc le
		// champ exact à corriger, comme le fait déjà `reasonFor` au rendu live.
		const verdict = isCampaignToken(token) ? state.campaign : state.simulation;
		if (verdict !== "ready") {
			note(token, verdict);
		}
	}
}

/* ──────────────────────────────────────────────────────────────────────────
   Résolution
   ────────────────────────────────────────────────────────────────────────── */

/** Lecture brute d'une propriété — voir la note sur le cycle d'imports en tête de fichier. */
function rawString(node: JCRNodeWrapper, name: string): string {
	try {
		return node.hasProperty(name) ? node.getProperty(name).getString() : "";
	} catch {
		return "";
	}
}

/** Remonte au `jnt:page` englobant la ressource principale. */
function currentPageNode(): JCRNodeWrapper | null {
	try {
		const { renderContext } = useServerContext();
		let current: JCRNodeWrapper | null = renderContext.getMainResource().getNode();
		while (current) {
			if (current.isNodeType("jnt:page")) return current;
			current = current.getParent() as JCRNodeWrapper | null;
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Clés d'un record Java, au mieux.
 *
 * Le moteur expose les objets Java en proxys polyglottes ; `Object.keys` y fonctionne mais
 * n'est pas garanti selon le type sous-jacent. En cas d'échec on renvoie une liste vide, et
 * l'appelant retombe sur les jetons documentés — jamais sur une table vide.
 */
function recordKeys(record: JavaRecord): string[] {
	try {
		const keys = Object.keys(record);
		return Array.isArray(keys) ? keys : [];
	} catch {
		return [];
	}
}

/**
 * Extrait les variables d'un `JavaRecord` renvoyé par le bridge.
 *
 * TOUTES les clés du sous-record `insurance` sont reprises, pas seulement celles connues :
 * c'est ce qui permet d'ajouter une variable côté Java sans modifier ce fichier. Les jetons
 * documentés sont lus en plus, pour garantir un plancher si l'introspection échoue.
 */
/**
 * Champs de structure du record : jamais des jetons.
 *
 * L'ouverture aux clés inconnues est délibérée — ajouter une variable côté Java ne doit pas
 * imposer de toucher ce fichier. Elle exige en contrepartie une liste EXPLICITE de ce qui n'en
 * est pas une, faute de quoi tout champ technique ajouté demain devient un jeton public.
 */
const STRUCTURAL_RECORD_KEYS = new Set(["insurance", "rows", "variant", "insuranceTextOverride"]);

function toVarSource(record: JavaRecord | null): InsuranceVarSource | null {
	if (!record) return null;
	const insurance = record["insurance"] as JavaRecord | undefined;

	const source: InsuranceVarSource = {};

	const put = (from: JavaRecord, key: string): void => {
		const value = readString(from, key);
		if (value) source[key] = value;
	};

	// Racine du record : `exampleAmount` et toute valeur future de même niveau, à l'exception
	// des champs de STRUCTURE. `insuranceTextOverride` porte un bloc HTML entier, rendu en aval
	// via `dangerouslySetInnerHTML` : l'exposer comme jeton offrirait à tout contributeur un
	// point d'injection de balisage arbitraire dans du texte éditorial. `variant` et `rows`
	// pilotent l'affichage, pas la substitution.
	for (const key of recordKeys(record)) {
		if (!STRUCTURAL_RECORD_KEYS.has(key)) put(record, key);
	}
	put(record, "exampleAmount");

	if (insurance) {
		for (const key of recordKeys(insurance)) put(insurance, key);
		// Plancher garanti : indépendant du succès de l'introspection.
		for (const key of INSURANCE_VAR_TOKENS) put(insurance, key);
	}

	return source;
}

/**
 * Chemin de repli tant que le filtre `sofinco-core` n'est pas déployé : lecture du mixin de
 * page puis appel direct au service OSGi. Une fois le filtre en place, l'attribut de requête
 * court-circuite ce chemin et le service n'est plus appelé qu'une fois par page.
 */
/**
 * État de la simulation de la page, lu du seul JCR — **jamais d'appel APIM**.
 *
 * Mémorisé par rendu : le contrôle statique interroge cet état pour chaque texte porteur d'un
 * jeton, il ne doit pas relire le nœud page à chaque fois.
 */
function readPageState(): PageState {
	if (pageState) return pageState;

	const page = currentPageNode();
	let state: PageState = { simulation: "no-params", campaign: "no-params" };
	if (page) {
		let hasMixin = false;
		try {
			hasMixin = page.isNodeType(SIMULATION_PARAMS_MIXIN);
		} catch {
			hasMixin = false;
		}
		if (hasMixin) {
			// Produit non renseigné → simulation inactive. Voir la note du CND : mieux vaut un
			// jeton visible que des chiffres calculés sur le mauvais type de crédit.
			//
			// Provenance non renseignée → campagne inactive, et c'est un champ DIFFÉRENT. Les
			// confondre signalait `{minAmount}` comme « type de crédit manquant » sur une page
			// qui n'avait en réalité pas de provenance — et, pire, ne signalait RIEN sur une
			// page pourvue d'un produit mais sans provenance, laissant partir en production un
			// jeton qui ne pourra jamais se résoudre.
			state = {
				simulation: rawString(page, "simProduct") ? "ready" : "no-product",
				campaign: rawString(page, "simSourceId") ? "ready" : "no-source",
			};
		}
	}

	pageState = state;
	return state;
}

function resolveRecordFromBridge(): JavaRecord | null {
	// Chemin SIMULATION : c'est le verdict de cette famille qui décide, et lui seul. La campagne
	// a son propre porteur et ses propres préconditions.
	const state = readPageState().simulation;
	if (state !== "ready") {
		lastReason = state;
		return null;
	}

	const page = currentPageNode();
	if (!page) {
		lastReason = "no-params";
		return null;
	}

	try {
		const bridge = server.osgi.getService(REPRESENTATIVE_EXAMPLE_BRIDGE) as BridgeLike | null;
		if (bridge && typeof bridge.getExample === "function") {
			return bridge.getExample(page);
		}
	} catch {
		// Journalisé côté Java avec le correlationId ; ici on se contente du diagnostic.
	}
	lastReason = "no-data";
	return null;
}

/**
 * Exemple représentatif de la PAGE courante, résolu une seule fois par rendu.
 *
 * <b>Point de mutualisation de toute la page.</b> Aussi bien la substitution des jetons que le
 * composant `RepresentativeExample` passent par ici : l'exemple n'est donc calculé qu'UNE fois,
 * quel que soit le nombre de consommateurs — au lieu d'un appel APIM par composant.
 *
 * Deux sources, dans l'ordre :
 *   1. l'attribut de requête posé par le filtre `sofinco-core` (cible) ;
 *   2. à défaut, le mixin de page + appel direct au service OSGi (transitoire).
 *
 * Renvoie `null` quand la page ne porte pas de simulation exploitable. Un appelant disposant
 * d'une autre origine — typiquement un `sofnt:representativeExample` non encore migré, qui
 * porte encore ses propres paramètres — peut alors prendre le relais.
 */
/**
 * Variables de campagne posées par le filtre `sofinco-core`, ou `null`.
 *
 * <p>Aucun repli sur un appel direct au pont, contrairement à `readSimulationRecord` : ce chemin
 * est né APRÈS le filtre, il n'a donc pas de contenu antérieur à faire vivre. Sans filtre déployé,
 * les jetons de campagne restent visibles et l'audit le signale — ce qui est le bon comportement,
 * plutôt qu'un second chemin de résolution à maintenir pour rien.
 */
export function readCampaignRecord(): JavaRecord | null {
	ensureCurrentRender();
	if (!armed || !resolving) return null;
	return readAttribute(CAMPAIGN_REQUEST_ATTRIBUTE);
}

export function readSimulationRecord(): JavaRecord | null {
	ensureCurrentRender();
	if (!armed) return null;

	/*
	 * La garde « aucun appel APIM en édition » vit ICI, pas seulement chez l'appelant.
	 * L'invariant est affirmé dans quatre docblocks et cette fonction est exportée : la faire
	 * dépendre de la vigilance de chaque appelant, c'est garantir qu'un jour l'un d'eux
	 * déclenchera un appel à chaque rechargement du Page Builder — donc en continu.
	 */
	if (!resolving) return null;

	/*
	 * L'attribut de requête n'est JAMAIS mémorisé : c'est la source de vérité, et le porteur
	 * paresseux côté Java garantit déjà « un seul calcul par requête ».
	 *
	 * Lecture protégée : `getRequestAttribute` déréférence `getRequest()` sans contrôle, et nous
	 * sommes désormais sur le chemin chaud de `str()`. Un rendu hors requête HTTP — flux, vue
	 * JSON — emporterait sinon le fragment entier, pas seulement la substitution.
	 */
	const fromFilter = readAttribute(SIMULATION_REQUEST_ATTRIBUTE);
	if (fromFilter) return fromFilter;

	// Repli transitoire, tant que le filtre `sofinco-core` n'est pas déployé. Mémorisé SUR LA
	// REQUÊTE (cf. BRIDGE_RECORD_ATTRIBUTE) : un mémo de module survivrait à la requête.
	const memo = readAttribute(BRIDGE_RECORD_ATTRIBUTE);
	if (memo) return memo;

	const resolved = resolveRecordFromBridge();
	if (resolved) {
		try {
			// `setAttribute` existe sur le HttpServletRequest de Jahia mais manque aux types
			// publiés du paquet — le cast porte sur cette seule méthode.
			const request = useServerContext().renderContext.getRequest() as unknown as {
				setAttribute(name: string, value: unknown): void;
			};
			request.setAttribute(BRIDGE_RECORD_ATTRIBUTE, resolved);
		} catch {
			/* pas de requête : on se passe du mémo, la résolution reste correcte */
		}
	}
	return resolved;
}

/**
 * Lecture d'attribut de requête tolérante.
 *
 * `getRequestAttribute` déréférence `getRequest()` sans contrôle et nous sommes sur le chemin
 * chaud de `str()` : hors requête HTTP — vue JSON, flux, test — l'exception emporterait le
 * fragment entier au lieu de la seule substitution.
 */
function readAttribute(name: string): JavaRecord | null {
	try {
		return getRequestAttribute<JavaRecord>(name);
	} catch {
		return null;
	}
}

/**
 * Table de la famille SIMULATION à partir du record du porteur.
 *
 * Un record PRÉSENT mais vide — APIM injoignable, réponse partielle — n'est pas la même chose
 * qu'une page sans simulation. Sans cette distinction la table vaudrait `{}`, tous les jetons y
 * seraient absents, et le panneau d'audit annoncerait « jeton inexistant, vérifiez l'orthographe »
 * pendant une panne de service : le contributeur corrigerait une faute qu'il n'a pas commise, et
 * l'incident réel resterait invisible.
 */
function buildSimulationVars(record: JavaRecord | null): Record<string, string> | null {
	const source = toVarSource(record);
	if (source === null || Object.keys(source).length === 0) {
		if (record) lastReason = "no-data";
		return null;
	}
	return buildInsuranceVarMap(source);
}

/** Jetons de campagne du rendu courant, déjà formatés côté Java. */
function readCampaignVars(): Record<string, string> {
	const record = readCampaignRecord();
	if (!record) return {};

	const vars: Record<string, string> = {};
	for (const token of CAMPAIGN_VAR_TOKENS) {
		const value = readString(record, token);
		if (value) vars[token] = value;
	}
	return vars;
}

/* ──────────────────────────────────────────────────────────────────────────
   Substitution
   ────────────────────────────────────────────────────────────────────────── */

/**
 * `{{jeton}}` et `{jeton}` — les deux formes existent dans le contenu publié. Le test rapide
 * ci-dessous évite toute résolution sur les chaînes qui n'en portent aucun, c'est-à-dire la
 * quasi-totalité des textes d'une page.
 */
const HAS_TOKEN = /\{\{?\w+\}?\}/;
const DOUBLE_BRACE = /\{\{(\w+)\}\}/g;
const SINGLE_BRACE = /\{(\w+)\}/g;
/** Les deux formes d'un coup, pour le contrôle statique — cf. `collectUnknownInsuranceVars`. */
const ANY_TOKEN = /\{\{?(\w+)\}?\}/g;

/**
 * Note un jeton non résolu — UNE ENTRÉE PAR (jeton, champ), pas une par occurrence.
 *
 * Même règle que pour les renvois de note : l'unité de correction est le CHAMP. Un même
 * `{{taea}}` fautif écrit dans le titre et dans le sous-titre d'un composant fait deux lignes,
 * parce qu'il faut ouvrir deux champs ; deux occurrences dans le même champ n'en font qu'une.
 */
/**
 * Motif d'échec, selon la FAMILLE du jeton.
 *
 * Un `{{taea}}` non résolu renvoie le contributeur au type de crédit de la page ; un `{minAmount}`
 * à sa provenance. Ce sont deux champs distincts des Options — annoncer le mauvais lui ferait
 * corriger un réglage déjà juste, et laisserait le vrai en l'état.
 *
 * `no-source` n'a de sens que pour la campagne : celle-ci n'exige QUE la provenance, là où une
 * simulation exige en plus le type de crédit, le montant et la durée.
 */
function reasonFor(
	token: string,
	fallback: UnresolvedInsuranceVar["reason"],
): UnresolvedInsuranceVar["reason"] {
	if (!isKnownToken(token)) return "unknown-token";
	if (isCampaignToken(token)) {
		return readCampaignRecord() ? "no-data" : "no-source";
	}
	return fallback;
}

function note(token: string, reason: UnresolvedInsuranceVar["reason"]): void {
	const location = readFootnoteLocation();
	const slot = location ? `${token}@${location.id}@${location.property}` : token;
	if (unresolved.has(slot)) return;
	unresolved.set(slot, { token, reason, location });
}

/**
 * Remplace les jetons de simulation d'un texte contributeur par leurs valeurs.
 *
 * Un jeton dont la valeur est introuvable est laissé TEL QUEL — jamais remplacé par du vide —
 * et signalé dans `readUnresolvedInsuranceVars()` pour le panneau d'audit. Sur une mention
 * légale, un trou silencieux est plus dangereux qu'un jeton visible.
 */
export function substituteInsuranceVars(text: string): string {
	if (!text || !HAS_TOKEN.test(text)) return text;
	ensureCurrentRender();
	if (!armed) return text;

	/*
	 * MODE ÉDITION — on ne résout rien, donc aucun appel APIM. Le texte est rendu tel que le
	 * contributeur l'a écrit, et le contrôle bascule sur sa variante statique : jetons
	 * inexistants d'un côté, absence de simulation sur la page de l'autre, les deux lus du seul
	 * JCR. Le panneau d'audit reste donc aussi informé qu'en live — davantage même, puisqu'il
	 * n'a plus besoin que le service réponde pour diagnostiquer.
	 */
	if (!resolving) {
		auditStatically(text);
		return text;
	}

	const replace = (full: string, key: string): string => {
		// AVANT toute résolution : un jeton réservé doit ressortir intact même si l'une des deux
		// familles venait à produire une valeur portant ce nom.
		if (isReservedToken(key)) return full;

		/*
		 * UN JETON INCONNU NE RÉSOUT RIEN.
		 *
		 * Il n'appartient à aucune des deux familles déclarées — ni `INSURANCE_VAR_TOKENS`, ni
		 * `CAMPAIGN_VAR_TOKENS`, ni les alias historiques. Aucun des deux services ne peut donc
		 * le produire, et interroger l'un des deux « au cas où » ferait payer un appel APIM pour
		 * une faute de frappe. Le signalement, lui, est identique : le panneau d'audit annonce
		 * le jeton et propose une correction quand un nom connu s'en approche.
		 */
		if (!isKnownToken(key)) {
			note(key, "unknown-token");
			return full;
		}

		/*
		 * AIGUILLAGE PAR FAMILLE — le point qui rend les deux porteurs utiles.
		 *
		 * Chaque famille ne touche QUE son porteur : une page n'affichant que des bornes d'offre
		 * ne déclenche aucun appel `calculate`, et une mention d'assurance n'interroge jamais
		 * l'endpoint des campagnes.
		 */
		const map = isCampaignToken(key) ? resolveCampaignVars() : resolveSimulationVars();
		const value = map?.[key];
		if (value !== undefined) return value;

		// Jeton connu mais sans valeur : donnée manquante ou famille inactive — jamais une faute
		// de frappe. `reasonFor` désigne le champ à corriger selon la famille.
		note(key, reasonFor(key, map ? "no-data" : lastReason));
		return full;
	};

	return text.replace(DOUBLE_BRACE, replace).replace(SINGLE_BRACE, replace);
}

/**
 * Table de la famille SIMULATION, résolue au plus une fois par rendu.
 *
 * Mémoïsation indexée sur l'IDENTITÉ du record, et non sur un drapeau : un record venu d'une
 * autre requête est forcément un autre objet, donc la table est reconstruite.
 */
function resolveSimulationVars(): Record<string, string> | null {
	const source = readSimulationRecord();
	if (simulationVars === undefined || varsSource !== source) {
		varsSource = source;
		simulationVars = buildSimulationVars(source);
	}
	return simulationVars;
}

/**
 * Table de la famille CAMPAGNE, résolue au plus une fois par rendu.
 *
 * Ne renvoie JAMAIS `null` — `readCampaignVars()` retourne `{}` quand la page n'a pas de
 * provenance. Le type le dit, pour que le site d'appel n'ait pas à prévoir un repli mort :
 * c'est `reasonFor` qui distingue « pas de provenance » de « pas de donnée », en relisant
 * lui-même le porteur.
 */
function resolveCampaignVars(): Record<string, string> {
	// GARDE D'IDENTITÉ, symétrique de `resolveSimulationVars`.
	//
	// `ensureCurrentRender` s'indexe sur le chemin de la ressource principale. Deux rendus
	// successifs de la MÊME page dans un contexte GraalVM du pool réutiliseraient donc la
	// mémoïsation sans relire le porteur. Même chemin implique aujourd'hui même provenance,
	// donc mêmes valeurs — mais c'est exactement la classe de réutilisation dont
	// `ensureCurrentRender` explique qu'elle produit « des chiffres réglementés faux,
	// durablement mémorisés ». On referme l'asymétrie plutôt que de parier sur l'invariant.
	const record = readCampaignRecord();
	if (campaignVars === undefined || campaignSource !== record) {
		campaignSource = record;
		campaignVars = readCampaignVars();
	}
	return campaignVars;
}
