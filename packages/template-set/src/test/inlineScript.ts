// Banc d'essai des scripts inline (footnote-bootstrap, footnote-audit).
//
// Ces scripts sont livrés en clair dans le <head> : ils ne peuvent RIEN importer, et le
// build les transforme via esbuild (plugin `?inline-script`). Le banc reproduit exactement
// cette chaîne — lecture du source, même transformation, évaluation dans une fenêtre
// happy-dom neuve — pour qu'un test porte sur l'artefact réellement servi, et non sur une
// réécriture qui pourrait diverger sans que personne ne s'en aperçoive.
//
// Une fenêtre par cas : ces scripts posent des écouteurs délégués sur `document`, et les
// réutiliser d'un test à l'autre les empilerait.
//
// Ce module est exclu de la couverture (cf. vitest.config.ts → coverage.exclude).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";
import { Window } from "happy-dom";

/**
 * Charge un script inline et le transforme comme le fait le build.
 *
 * @param file Chemin relatif à `src`, ex. `"lib/footnote-bootstrap.ts"` ou
 *   `"audit/panel-bootstrap.ts"`.
 */
export function loadInlineScript(file: string): string {
	const path = fileURLToPath(new URL(`../${file}`, import.meta.url));
	const source = readFileSync(path, "utf8")
		// `export {}` marque le fichier comme module pour TypeScript ; aucun sens à l'eval.
		.replace(/^export\s*\{\s*\};?\s*$/m, "");

	return transformSync(source, { loader: "ts", format: "iife" }).code;
}

export interface ScriptHarness {
	window: Window;
	document: Document;
	/** Éléments passés à `scrollIntoView`, dans l'ordre. */
	scrolled: Element[];
	/**
	 * Éléments dont le script a MESURÉ la position, dans l'ordre — c'est-à-dire ceux qu'il a
	 * décidé d'atteindre, qu'il ait fallu défiler ou non. Seule façon d'observer la cible
	 * retenue quand le défilement passe par `window.scrollTo`, qui ne la nomme pas.
	 */
	revealed: Element[];
	/** Positions passées à `window.scrollTo`, dans l'ordre. */
	scrolledTo: number[];
	/**
	 * Options passées à chaque `scrollIntoView`. Le mode importe : `smooth` produit une rafale
	 * d'événements `scroll` qui désynchronise la surcouche du Page Builder.
	 */
	scrollOptions: Array<ScrollIntoViewOptions | undefined>;
	/** Options passées à chaque `window.scrollTo` — même exigence sur le mode. */
	scrollToOptions: Array<ScrollToOptions | undefined>;
	/** Déclenche un clic bouillonnant ; renvoie `true` si le défaut a été empêché. */
	click(selectorOrElement: string | Element): boolean;
	/** Émet `load`, pour les scripts qui attendent la fin du chargement. */
	fireLoad(): void;
	$(selector: string): Element | null;
	$$(selector: string): Element[];
	close(): void;
}

export interface BootOptions {
	/** Valeur de `window.__SOFINCO_FOOTNOTE_LABEL__`. */
	label?: string;
	/** Position de lecture simulée — dernier recours de la mémoire de marqueur. */
	scrollY?: number;
	/**
	 * Pose `window.__SOFINCO_EDIT_MODE__`. En mode édition le script principal doit être
	 * TOTALEMENT inerte : la page est l'espace de travail du Page Builder.
	 */
	editMode?: boolean;
	/**
	 * Fenêtre à exposer comme `window.top`, pour simuler l'iframe du Page Builder. Le bandeau
	 * de contrôle doit alors se construire dans CE document-là, jamais dans la page inspectée.
	 */
	topWindow?: Window;
}

/**
 * Monte une page et y exécute les scripts fournis, dans l'ordre.
 */
export function bootPage(
	scripts: string[],
	html: string,
	{ label = "note de bas de page", scrollY = 0, editMode = false, topWindow }: BootOptions = {},
): ScriptHarness {
	const window = new Window({ url: "https://sofinco.test/page" });
	const document = window.document as unknown as Document;

	/*
	 * happy-dom ne calcule aucune mise en page : tout rectangle serait nul, donc
	 * `isVisible` répondrait « invisible » pour TOUT élément et la mémoire de marqueur
	 * retomberait systématiquement sur son repli. On simule la seule chose dont le script a
	 * besoin : `data-collapsed` = replié (surface nulle), sinon visible.
	 */
	/*
	 * Par défaut la cible est HORS ÉCRAN : c'est le cas qui déclenche un défilement, donc
	 * celui que la plupart des tests veulent exercer. `data-in-view` la ramène dans le
	 * viewport pour vérifier qu'on s'abstient alors de défiler.
	 */
	const revealed: Element[] = [];
	window.Element.prototype.getBoundingClientRect = function (this: Element) {
		revealed.push(this);
		const size = this.hasAttribute("data-collapsed") ? 0 : 10;
		// `data-top` place la cible à une ordonnée précise, pour les calculs de défilement.
		const forced = this.getAttribute("data-top");
		const top = forced !== null ? Number(forced) : this.closest("[data-in-view]") ? 200 : 2000;
		return { top, left: 0, bottom: top + size, right: 10, width: size, height: size, x: 0, y: top };
	} as never;

	const scrolled: Element[] = [];
	const scrollOptions: Array<ScrollIntoViewOptions | undefined> = [];
	window.Element.prototype.scrollIntoView = function (
		this: Element,
		options?: ScrollIntoViewOptions,
	) {
		scrolled.push(this);
		scrollOptions.push(options);
	} as never;

	const scrolledTo: number[] = [];
	const scrollToOptions: Array<ScrollToOptions | undefined> = [];
	window.scrollTo = ((arg: ScrollToOptions | number) => {
		const isNumber = typeof arg === "number";
		scrolledTo.push(isNumber ? arg : (arg?.top ?? 0));
		scrollToOptions.push(isNumber ? undefined : arg);
	}) as never;

	Object.defineProperty(window, "scrollY", { value: scrollY, configurable: true });
	(window as unknown as Record<string, unknown>).__SOFINCO_FOOTNOTE_LABEL__ = label;
	if (editMode) (window as unknown as Record<string, unknown>).__SOFINCO_EDIT_MODE__ = true;
	if (topWindow) Object.defineProperty(window, "top", { value: topWindow, configurable: true });

	document.body.innerHTML = html;
	for (const script of scripts) window.eval(script);

	return {
		window,
		document,
		scrolled,
		revealed,
		scrolledTo,
		scrollOptions,
		scrollToOptions,
		$: (selector) => document.querySelector(selector),
		$$: (selector) => Array.from(document.querySelectorAll(selector)),
		fireLoad() {
			window.dispatchEvent(new window.Event("load") as never);
		},
		click(target) {
			const element = typeof target === "string" ? document.querySelector(target) : target;
			if (!element) throw new Error(`Élément introuvable : ${String(target)}`);
			const event = new window.MouseEvent("click", { bubbles: true, cancelable: true });
			element.dispatchEvent(event as never);
			return event.defaultPrevented;
		},
		close() {
			// Coupe les intervalles de poursuite encore actifs et libère la fenêtre.
			this.window.happyDOM?.abort?.();
			this.window.close?.();
		},
	};
}

/**
 * Marqueur tel que `manageFooterNote` le produit côté serveur.
 *
 * AUCUN `id` : une note appelée plusieurs fois en produirait autant d'homonymes. Le retour
 * se résout par `data-footer`.
 */
export const marker = (n: number | string) =>
	`<a href="#footer${n}" data-footer="footer${n}" class="footer-link"><sup>(${n})</sup></a>`;

/** Note telle que `addIdToParagraph` la produit, retour ↩ compris. */
export const note = (n: number | string) =>
	`<p id="footer${n}"><sup>(${n})</sup> Mention légale.` +
	`<button type="button" class="footer-back-link" data-footer="footer${n}">↩</button></p>`;
