/*
 * Premiers tests du plugin « Variables simulateur / campagne ».
 *
 * Ce fichier n'en avait aucun, et c'est ce qui a laissé passer DEUX régressions relevées en
 * revue de MR — un état de page renvoyé sous forme de chaîne là où tout le reste attendait un
 * objet, et un état « on ne sait pas » qui verrouillait les deux menus. Les deux touchaient
 * directement le contributeur, et aucune n'était visible en CI.
 *
 * On couvre donc en priorité l'aiguillage qui décide si une variable est insérable, puis les
 * fonctions pures qui l'alimentent : lecture de l'état de page, résolution de la page
 * englobante, lecture de la configuration de site, et échappement des libellés.
 *
 * `happy-dom` est nécessaire : le plugin lit `window` et `location`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	SIMULATOR_VARS_API_KEYS,
	closeSimulatorVarsPlugins,
	loadSimulatorVarsPlugin,
	type ButtonConfig,
	type SimulatorVarsApi,
} from "./loadPlugin";

let api: SimulatorVarsApi;

beforeAll(() => {
	api = loadSimulatorVarsPlugin();
});

afterAll(async () => {
	await closeSimulatorVarsPlugins();
});

/* ────────────────────────────────────────────────────────────────────────── */

/** Les deux boutons réels, réduits à ce dont la décision a besoin. */
const simulationButton = (): ButtonConfig => ({
	available: (state) => state.simulation,
	unavailableNotice: api.NOTICE["no-simulation"],
});

const campaignButton = (): ButtonConfig => ({
	available: (state) => state.campaign,
	unavailableNotice: api.NOTICE["no-campaign"],
});

/** Réponse GraphQL de page, telle que `readPageState` la reçoit. */
const pageResponse = (page: Record<string, unknown> | null) => ({
	data: { jcr: { nodeByPath: page } },
});

const page = (over: Record<string, unknown> = {}) => ({
	isPage: true,
	hasSimulation: true,
	...over,
});

describe("unavailableReason — l'aiguillage qui décide si une variable est insérable", () => {
	/*
	 * LA RÉGRESSION FIGÉE.
	 *
	 * `unknown` signifie « on ne sait pas » : hors route jContent (aperçu, éditeur autonome,
	 * harnais de test) ou requête de page en échec. La liste de repli est chargée dans les deux
	 * cas ; la refuser rendait le menu définitivement muet sur une page peut-être parfaitement
	 * configurée. C'est le comportement d'avant la séparation en deux familles.
	 */
	it("laisse passer les DEUX familles sur un état inconnu", () => {
		const state = api.UNKNOWN_STATE();

		expect(api.unavailableReason(state, simulationButton())).toBeNull();
		expect(api.unavailableReason(state, campaignButton())).toBeNull();
	});

	/*
	 * Sans mixin, il n'y a rien à compléter champ par champ : c'est l'option entière qui
	 * manque. Le refus est donc COMMUN, et le message renvoie vers les Options de la page.
	 */
	it("refuse les deux familles sans le mixin, avec le même motif", () => {
		const state = api.readPageState(pageResponse(page({ hasSimulation: false })));

		expect(api.unavailableReason(state, simulationButton())).toBe(api.NOTICE["no-params"]);
		expect(api.unavailableReason(state, campaignButton())).toBe(api.NOTICE["no-params"]);
	});

	/*
	 * Le cœur de la séparation en deux familles : une provenance suffit aux bornes de l'offre,
	 * et un contributeur qui ne veut qu'un `{minAmount}` n'a pas à renseigner un type de crédit
	 * qui pilote, lui, des chiffres réglementés.
	 */
	it("refuse la simulation mais autorise la campagne quand seule la provenance est saisie", () => {
		const state = api.readPageState(pageResponse(page({ sourceId: { value: "NEOURL41" } })));

		expect(api.unavailableReason(state, simulationButton())).toBe(api.NOTICE["no-simulation"]);
		expect(api.unavailableReason(state, campaignButton())).toBeNull();
	});

	it("refuse la campagne mais autorise la simulation quand seul le produit est saisi", () => {
		const state = api.readPageState(pageResponse(page({ product: { value: "CR" } })));

		expect(api.unavailableReason(state, campaignButton())).toBe(api.NOTICE["no-campaign"]);
		expect(api.unavailableReason(state, simulationButton())).toBeNull();
	});

	it("laisse passer les deux familles sur une page complète", () => {
		const state = api.readPageState(
			pageResponse(page({ product: { value: "PB" }, sourceId: { value: "NEOURL41" } })),
		);

		expect(api.unavailableReason(state, simulationButton())).toBeNull();
		expect(api.unavailableReason(state, campaignButton())).toBeNull();
	});

	/*
	 * DÉFENSE CONTRE LA PREMIÈRE RÉGRESSION : un `catch` renvoyait la chaîne nue "unknown" là
	 * où tout le reste attend un objet. `state.state` valait alors `undefined` et
	 * `state.simulation` aussi — les deux menus se verrouillaient. Un état absent ou malformé
	 * doit donc échouer du côté SÛR : on affiche un motif, jamais un crash.
	 */
	it("ne lève pas sur un état absent", () => {
		expect(api.unavailableReason(null, simulationButton())).toBe(api.NOTICE["no-params"]);
	});
});

describe("readPageState", () => {
	it("rend « ready » et les deux familles sur une page complète", () => {
		expect(
			api.readPageState(
				pageResponse(page({ product: { value: "PB" }, sourceId: { value: "NEOURL41" } })),
			),
		).toEqual({ state: "ready", simulation: true, campaign: true });
	});

	it("rend « no-product » quand le type de crédit manque", () => {
		expect(api.readPageState(pageResponse(page({ sourceId: { value: "NEOURL41" } })))).toEqual({
			state: "no-product",
			simulation: false,
			campaign: true,
		});
	});

	it("rend « no-params » sans le mixin", () => {
		expect(api.readPageState(pageResponse(page({ hasSimulation: false })))).toEqual({
			state: "no-params",
			simulation: false,
			campaign: false,
		});
	});

	/*
	 * Une valeur blanche n'est pas une valeur : le champ est facultatif côté CND, et un espace
	 * saisi par mégarde ne doit pas faire croire à une provenance renseignée — les jetons
	 * partiraient alors en production sans jamais se résoudre.
	 */
	it.each([
		["chaîne vide", ""],
		["espaces seuls", "   "],
	])("ne prend pas %s pour une valeur", (_label, value) => {
		const state = api.readPageState(
			pageResponse(page({ product: { value }, sourceId: { value } })),
		);
		expect(state).toEqual({ state: "no-product", simulation: false, campaign: false });
	});

	/*
	 * TOUTES les sorties doivent avoir la MÊME FORME. C'est exactement ce qui manquait quand un
	 * `catch` renvoyait une chaîne : la garde `no-params` était sautée et `available()` lisait
	 * `undefined`.
	 */
	it.each([
		["réponse nulle", null],
		["réponse vide", {}],
		["nœud absent", { data: { jcr: { nodeByPath: null } } }],
		["nœud sans page englobante", { data: { jcr: { nodeByPath: { isPage: false } } } }],
	])("rend un état inconnu BIEN FORMÉ pour %s", (_label, json) => {
		expect(api.readPageState(json)).toEqual(api.UNKNOWN_STATE());
	});
});

describe("UNKNOWN_STATE", () => {
	it("décrit une ignorance, pas une disponibilité", () => {
		expect(api.UNKNOWN_STATE()).toEqual({
			state: "unknown",
			simulation: false,
			campaign: false,
		});
	});

	/*
	 * Fabrique et NON constante partagée : l'objet est stocké dans `cache.pageState`. Une
	 * constante exposerait la même instance à toutes les pages, et une mutation accidentelle
	 * la propagerait partout.
	 */
	it("rend une instance NEUVE à chaque appel", () => {
		expect(api.UNKNOWN_STATE()).not.toBe(api.UNKNOWN_STATE());
	});
});

describe("pickPage", () => {
	it("retient le nœud lui-même quand c'est une page", () => {
		const node = { isPage: true, path: "/sites/s/home" };
		expect(api.pickPage(node)).toBe(node);
	});

	/*
	 * `ancestors` est ordonné de la racine vers le parent : la page la PLUS PROCHE est la
	 * dernière. Prendre la première remonterait à la home du site, dont les paramètres de
	 * simulation n'ont rien à voir avec ceux de la page éditée.
	 */
	it("retient la page la plus PROCHE, pas la racine", () => {
		expect(
			api.pickPage({
				isPage: false,
				ancestors: [
					{ isPage: true, path: "/sites/s/home" },
					{ isPage: true, path: "/sites/s/home/produit" },
					{ isPage: false, path: "/sites/s/home/produit/zone" },
				],
			}),
		).toMatchObject({ path: "/sites/s/home/produit" });
	});

	it.each([
		["nœud absent", null],
		["aucun ancêtre page", { isPage: false, ancestors: [{ isPage: false }] }],
		["sans ancêtres", { isPage: false }],
	])("rend null pour %s", (_label, node) => {
		expect(api.pickPage(node)).toBeNull();
	});
});

describe("encodeLabel", () => {
	/*
	 * Le libellé vient du `jcr:title` d'un nœud de configuration de site : une valeur
	 * CONTRIBUÉE. Les gabarits de menu de CKEditor 4 interpolent `{label}` dans du HTML SANS
	 * l'encoder — du balisage saisi là s'exécuterait dans l'interface d'auteur, et la valeur
	 * étant STOCKÉE, il s'exécuterait pour quiconque ouvre ensuite le menu.
	 *
	 * Sous test `CKEDITOR` est absent : c'est donc le repli manuel qui est exercé ici, celui
	 * qui doit tenir le jour où l'API de CKEditor bougerait.
	 */
	it("neutralise une tentative d'injection", () => {
		expect(api.encodeLabel('<img src=x onerror="alert(1)">')).not.toContain("<img");
	});

	it.each([
		["chevrons", "<b>x</b>", "&lt;b&gt;x&lt;/b&gt;"],
		["esperluette", "Taux & co", "Taux &amp; co"],
		["guillemets", 'dit "oui"', "dit &quot;oui&quot;"],
	])("échappe les %s", (_label, input, expected) => {
		expect(api.encodeLabel(input)).toBe(expected);
	});

	/*
	 * L'esperluette doit être traitée EN PREMIER, sinon `<` déjà encodé en `&lt;` verrait son
	 * `&` ré-encodé et le libellé afficherait `&amp;lt;`.
	 */
	it("n'encode pas deux fois", () => {
		expect(api.encodeLabel("<a & b>")).toBe("&lt;a &amp; b&gt;");
	});

	it("laisse un libellé ordinaire intact", () => {
		expect(api.encodeLabel("Montant minimum de l’offre (€)")).toBe(
			"Montant minimum de l’offre (€)",
		);
	});
});

describe("readVars", () => {
	const config = (nodes: Array<Record<string, unknown>>) => ({
		data: { jcr: { nodeByPath: { children: { nodes } } } },
	});

	const entry = (over: Record<string, unknown> = {}) => ({
		token: { value: "taea" },
		label: { value: "TAEA (%)" },
		...over,
	});

	it("lit jeton, libellé et famille", () => {
		expect(
			api.readVars(
				config([entry({ token: { value: "minAmount" }, family: { value: "campagne" } })]),
			),
		).toEqual([{ token: "minAmount", label: "TAEA (%)", family: api.FAMILY_CAMPAIGN }]);
	});

	/*
	 * `family` est `autocreated`, ce qui ne joue QU'À LA CRÉATION du nœud : les variables
	 * livrées avant cette évolution n'en ont donc jamais. C'est ce repli — et non la valeur par
	 * défaut du CND — qui évite une reprise de contenu.
	 */
	it("fait retomber une famille absente sur la simulation", () => {
		expect(api.readVars(config([entry()]))[0].family).toBe(api.FAMILY_SIMULATION);
	});

	it("fait retomber une famille inconnue sur la simulation", () => {
		expect(api.readVars(config([entry({ family: { value: "n'importe quoi" } })]))[0].family).toBe(
			api.FAMILY_SIMULATION,
		);
	});

	it("écarte une variable désactivée", () => {
		expect(api.readVars(config([entry({ enabled: { value: "false" } })]))).toEqual([]);
	});

	/*
	 * `enabled` est `autocreated` à true : une valeur absente vaut « proposée ». La traiter
	 * comme désactivée viderait le menu sur tout contenu antérieur au champ.
	 */
	it("considère une variable sans drapeau comme activée", () => {
		expect(api.readVars(config([entry()]))).toHaveLength(1);
	});

	it("écarte une entrée sans jeton", () => {
		expect(api.readVars(config([entry({ token: { value: "" } })]))).toEqual([]);
	});

	/*
	 * Titre absent — contenu importé, jamais traduit dans cette langue : on retombe sur le nom
	 * technique plutôt que d'afficher une entrée vide, impossible à choisir dans le menu.
	 */
	it("retombe sur le jeton quand le libellé manque", () => {
		expect(api.readVars(config([entry({ label: undefined })]))[0].label).toBe("taea");
	});

	/** L'échappement a lieu à la FRONTIÈRE d'entrée, pas au point d'affichage. */
	it("échappe le libellé dès la lecture", () => {
		expect(api.readVars(config([entry({ label: { value: "<b>x</b>" } })]))[0].label).toBe(
			"&lt;b&gt;x&lt;/b&gt;",
		);
	});

	/*
	 * Config absente ou vide → repli, pour que le plugin reste utilisable sur un environnement
	 * fraîchement déployé où le script d'amorçage n'a pas encore tourné.
	 */
	it.each([
		["réponse nulle", null],
		["nœud absent", { data: { jcr: { nodeByPath: null } } }],
		["aucun enfant", { data: { jcr: { nodeByPath: { children: { nodes: [] } } } } }],
	])("retombe sur la liste par défaut pour %s", (_label, json) => {
		expect(api.readVars(json)).toBe(api.DEFAULT_ALL_VARS);
	});

	/*
	 * Config présente mais TOUT désactivé : on respecte la décision du contributeur plutôt que
	 * de réafficher le repli, qui donnerait l'impression d'un réglage ignoré.
	 */
	it("rend une liste vide quand tout est désactivé — sans revenir au repli", () => {
		expect(api.readVars(config([entry({ enabled: { value: "false" } })]))).toEqual([]);
	});
});

describe("DEFAULT_ALL_VARS", () => {
	it("couvre les deux familles", () => {
		const families = new Set(api.DEFAULT_ALL_VARS.map((v) => v.family));
		expect(families).toEqual(new Set([api.FAMILY_SIMULATION, api.FAMILY_CAMPAIGN]));
	});

	/** Un jeton vide ou dupliqué produirait une entrée de menu inutilisable. */
	it("n'a ni jeton vide ni doublon", () => {
		const tokens = api.DEFAULT_ALL_VARS.map((v) => v.token);
		expect(tokens.every(Boolean)).toBe(true);
		expect(new Set(tokens).size).toBe(tokens.length);
	});
});

describe("contextFromRoute", () => {
	/*
	 * Hors route jContent — aperçu, éditeur autonome, harnais de test — il n'y a ni site ni
	 * langue à déduire. Renvoyer null est ce qui met le plugin en état « unknown », lequel doit
	 * rester permissif : c'est la deuxième régression figée plus haut.
	 */
	it("rend null hors route jContent", () => {
		expect(api.contextFromRoute()).toBeNull();
	});

	it("déduit site, langue et chemin JCR d'une route jContent", () => {
		const jcontent = loadSimulatorVarsPlugin(
			"https://sofinco.test/jcontent/sofinco/fr/pages/home/produit",
		);

		expect(jcontent.contextFromRoute()).toEqual({
			site: "sofinco",
			lang: "fr",
			path: "/sites/sofinco/home/produit",
		});
	});
});

describe("surface de test publiée", () => {
	/*
	 * `SimulatorVarsApi` est un miroir MANUEL de ce que publie `plugin.js` — un JS en
	 * `@ts-nocheck`, que le compilateur ne confronte jamais à l'interface. Ce test est donc le
	 * SEUL endroit où un helper renommé se signale.
	 */
	it("expose exactement les helpers déclarés par SimulatorVarsApi", () => {
		for (const key of SIMULATOR_VARS_API_KEYS) {
			expect(typeof api[key], `helper manquant : ${key}`).toBe("function");
		}
	});

	it("publie aussi les tables dont les tests ont besoin", () => {
		expect(api.NOTICE).toBeTypeOf("object");
		expect(Array.isArray(api.DEFAULT_ALL_VARS)).toBe(true);
	});
});
