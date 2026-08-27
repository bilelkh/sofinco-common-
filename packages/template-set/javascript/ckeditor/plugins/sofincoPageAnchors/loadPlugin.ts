/**
 * Charge `plugin.js` TEL QU'IL EST LIVRÉ et rend ses helpers purs.
 *
 * On évalue l'artefact réel, jamais une réécriture : c'est ce fichier-là que CKEditor charge
 * en production, et c'est la seule chose dont un test tire une valeur. Même parti pris que
 * `#test/inlineScript` pour les scripts clients.
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

export interface PageAnchorsApi {
	filterHtmlId: (input: unknown) => string;
	normalizeNumber: (value: unknown) => string;
	footnoteId: (anchor: unknown) => string;
	toSuperscript: (value: string) => string;
	componentLabel: (nodeTypeName: string) => string;
	textFromHtml: (html: unknown) => string;
	truncate: (text: string, max: number) => string;
	stripLeadingNumber: (text: string, number: string) => string;
	resolvePagePath: (data: unknown) => string | null;
	declaredAnchorOf: (node: Record<string, unknown>) => Record<string, unknown> | null;
	pageContentNodes: (data: unknown) => Array<Record<string, unknown>>;
	buildDeclaredAnchors: (data: unknown) => Array<Record<string, unknown>>;
	buildContentAnchors: (
		data: unknown,
		declaredFragments: string[],
	) => Array<Record<string, unknown>>;
	capAnchors: (list: Array<Record<string, unknown>>) => {
		list: Array<Record<string, unknown>>;
		hidden: number;
	};
	signature: (list: Array<Record<string, unknown>>) => string;
	/** Zones de contenu interrogées, copie des `<Area name>` des gabarits. */
	PAGE_AREAS: string[];
	/** Zones des gabarits volontairement hors périmètre. */
	EXCLUDED_AREAS: string[];
	DECLARED_QUERY: string;
	CONTENT_QUERY: string;
}

/**
 * Noms attendus dans la surface publiée, ordre de `plugin.js`.
 *
 * `PageAnchorsApi` est un miroir MANUEL de ce que l'IIFE expose : TypeScript ne peut pas le
 * vérifier, `plugin.js` étant du JS en `@ts-nocheck`. Cette liste rend l'écart détectable à
 * l'exécution — un helper renommé fait échouer le chargement au lieu de produire un
 * `undefined is not a function` au milieu d'un test sans rapport.
 */
export const PAGE_ANCHORS_API_KEYS = [
	"filterHtmlId",
	"normalizeNumber",
	"footnoteId",
	"toSuperscript",
	"componentLabel",
	"textFromHtml",
	"truncate",
	"stripLeadingNumber",
	"resolvePagePath",
	"declaredAnchorOf",
	"pageContentNodes",
	"buildDeclaredAnchors",
	"buildContentAnchors",
	"capAnchors",
	"signature",
] as const satisfies ReadonlyArray<keyof PageAnchorsApi>;

/** Même rôle, pour la part de la surface qui n'est pas appelable. */
export const PAGE_ANCHORS_QUERY_KEYS = [
	"DECLARED_QUERY",
	"CONTENT_QUERY",
] as const satisfies ReadonlyArray<keyof PageAnchorsApi>;

/**
 * Listes de zones. Séparées des requêtes : ce sont des tableaux, et la dérive qu'on veut
 * détecter n'est pas la même — non pas « le helper a été renommé » mais « une zone a été
 * ajoutée à un gabarit sans que personne ne dise si elle entre dans le périmètre ».
 */
export const PAGE_ANCHORS_LIST_KEYS = [
	"PAGE_AREAS",
	"EXCLUDED_AREAS",
] as const satisfies ReadonlyArray<keyof PageAnchorsApi>;

const SOURCE = readFileSync(fileURLToPath(new URL("./plugin.js", import.meta.url)), "utf8");

/** Fenêtre du dernier chargement, gardée pour {@link closePageAnchorsPlugin}. */
let openWindow: Window | null = null;

export function loadPageAnchorsPlugin(): PageAnchorsApi {
	// URL hors route jContent : `contextFromRoute` renvoie null, donc aucune requête n'est
	// tentée — les helpers purs sont atteints sans réseau.
	const window = new Window({ url: "https://sofinco.test/page" });
	const scope = window as unknown as Record<string, unknown>;

	scope.__SOFINCO_TEST__ = true;
	// `CKEDITOR` reste absent : le plugin s'arrête juste après avoir publié ses helpers.
	window.eval(SOURCE);

	const api = scope.__sofincoPageAnchors as PageAnchorsApi | undefined;
	if (!api) throw new Error("plugin.js n'a pas publié sa surface de test");

	const missing = [
		...PAGE_ANCHORS_API_KEYS.filter((key) => typeof api[key] !== "function"),
		...PAGE_ANCHORS_QUERY_KEYS.filter((key) => typeof api[key] !== "string"),
		...PAGE_ANCHORS_LIST_KEYS.filter((key) => !Array.isArray(api[key])),
	];
	if (missing.length) {
		throw new Error(
			"plugin.js ne publie plus : " +
				missing.join(", ") +
				" — mettre à jour PageAnchorsApi et PAGE_ANCHORS_API_KEYS.",
		);
	}

	openWindow = window;
	return api;
}

/**
 * Ferme la fenêtre happy-dom ouverte par {@link loadPageAnchorsPlugin}.
 *
 * La fenêtre porte des timers et des observateurs ; laissée ouverte, elle retient le worker
 * Vitest après la fin du fichier de test. La fermeture ne peut donc PAS avoir lieu dans
 * `loadPageAnchorsPlugin` : `buildContentAnchors` s'appuie sur le `DOMParser` de cette
 * fenêtre, qui doit rester vivante tant que les tests appellent l'API.
 */
export async function closePageAnchorsPlugin(): Promise<void> {
	if (!openWindow) return;
	const window = openWindow;
	openWindow = null;
	await window.happyDOM.close();
}
