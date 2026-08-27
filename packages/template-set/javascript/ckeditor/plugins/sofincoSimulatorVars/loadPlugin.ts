/**
 * Charge `plugin.js` TEL QU'IL EST LIVRÉ et rend ses helpers purs.
 *
 * On évalue l'artefact réel, jamais une réécriture : c'est ce fichier-là que CKEditor charge
 * en production, et c'est la seule chose dont un test tire une valeur. Même dispositif que
 * `sofincoPageAnchors/loadPlugin.ts`.
 *
 * La fenêtre happy-dom est construite ICI plutôt que d'être imposée au fichier de test par
 * `@vitest-environment` : en environnement happy-dom, `import.meta.url` devient une URL
 * `http:` et `fileURLToPath` refuse de lire le fichier. Les tests restent donc en
 * environnement `node`, comme le reste du dépôt.
 *
 * `__SOFINCO_TEST__` est posé AVANT l'évaluation : c'est lui qui active la surface de test
 * en fin d'IIFE. Sans lui, le plugin ne publie rien.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Window } from "happy-dom";

/** Un jeton tel que le menu le manipule, après lecture de la config de site. */
export interface SimulatorVar {
	token: string;
	label: string;
	family: string;
}

/** État de page, par famille — voir `readPageState` dans `plugin.js`. */
export interface PageState {
	state: "ready" | "no-params" | "no-product" | "unknown";
	simulation: boolean;
	campaign: boolean;
}

/** Configuration d'un des deux menubuttons, réduite à ce dont la décision a besoin. */
export interface ButtonConfig {
	available: (state: PageState) => boolean;
	unavailableNotice: string;
}

export interface SimulatorVarsApi {
	pickPage: (node: unknown) => Record<string, unknown> | null;
	UNKNOWN_STATE: () => PageState;
	readPageState: (json: unknown) => PageState;
	encodeLabel: (value: unknown) => string;
	readVars: (json: unknown) => SimulatorVar[];
	unavailableReason: (state: PageState | null, config: ButtonConfig) => string | null;
	contextFromRoute: () => { site: string; lang: string; path: string } | null;
	NOTICE: Record<string, string>;
	DEFAULT_ALL_VARS: SimulatorVar[];
	FAMILY_SIMULATION: string;
	FAMILY_CAMPAIGN: string;
}

/**
 * Noms attendus dans la surface publiée, ordre de `plugin.js`.
 *
 * `SimulatorVarsApi` est un miroir MANUEL de ce que l'IIFE expose : TypeScript ne peut pas le
 * vérifier, `plugin.js` étant du JS en `@ts-nocheck`. Cette liste rend l'écart détectable à
 * l'exécution — un helper renommé fait échouer le chargement au lieu de produire un
 * `undefined is not a function` au milieu d'un test sans rapport.
 */
export const SIMULATOR_VARS_API_KEYS = [
	"pickPage",
	"UNKNOWN_STATE",
	"readPageState",
	"encodeLabel",
	"readVars",
	"unavailableReason",
	"contextFromRoute",
] as const satisfies ReadonlyArray<keyof SimulatorVarsApi>;

const SOURCE = readFileSync(fileURLToPath(new URL("./plugin.js", import.meta.url)), "utf8");

/** Fenêtres ouvertes, gardées pour {@link closeSimulatorVarsPlugins}. */
const openWindows: Window[] = [];

/**
 * URL par défaut : HORS route jContent, donc `contextFromRoute` renvoie `null` et aucune
 * requête n'est tentée — les helpers purs sont atteints sans réseau.
 */
const OUTSIDE_JCONTENT = "https://sofinco.test/page";

/**
 * @param url adresse de la fenêtre. `contextFromRoute` la lit, c'est le seul helper sensible
 *   à l'URL : un test qui l'exerce charge une seconde instance avec une route jContent.
 */
export function loadSimulatorVarsPlugin(url: string = OUTSIDE_JCONTENT): SimulatorVarsApi {
	const window = new Window({ url });
	const scope = window as unknown as Record<string, unknown>;

	scope.__SOFINCO_TEST__ = true;
	// `CKEDITOR` reste absent : le plugin s'arrête juste après avoir publié ses helpers.
	window.eval(SOURCE);

	const api = scope.__sofincoSimulatorVars as SimulatorVarsApi | undefined;
	if (!api) throw new Error("plugin.js n'a pas publié sa surface de test");

	const missing = SIMULATOR_VARS_API_KEYS.filter((key) => typeof api[key] !== "function");
	if (missing.length) {
		throw new Error(
			"plugin.js ne publie plus : " +
				missing.join(", ") +
				" — mettre à jour SimulatorVarsApi et SIMULATOR_VARS_API_KEYS.",
		);
	}

	openWindows.push(window);
	return api;
}

/**
 * Ferme les fenêtres happy-dom ouvertes.
 *
 * Elles portent des timers et des observateurs ; laissées ouvertes, elles retiennent le
 * worker Vitest après la fin du fichier de test. La fermeture ne peut donc PAS avoir lieu
 * dans le chargement : les helpers restent appelés tant que les tests tournent.
 */
export async function closeSimulatorVarsPlugins(): Promise<void> {
	const windows = openWindows.splice(0, openWindows.length);
	for (const window of windows) {
		await window.happyDOM.close();
	}
}
