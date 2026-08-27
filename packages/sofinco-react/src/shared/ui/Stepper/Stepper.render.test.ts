/*
 * Contrat de rendu de `Stepper`.
 *
 * Deux choses sont vérifiées ici, qu'aucun test visuel ne couvre :
 *
 *  - la **dérivation des états** à partir de `activeStep` — combien de segments
 *    remplis, quelle pastille cochée, laquelle en contour. C'est de l'arithmétique
 *    d'index, silencieusement fausse d'une unité si elle régresse.
 *  - le **contrat d'accessibilité**, qui diffère d'une variante à l'autre
 *    (`progressbar` d'un côté, liste ordonnée de l'autre) et qui repose sur des
 *    attributs invisibles à l'écran.
 *
 * Écrit en `.ts` et non `.tsx` pour rester aligné sur `TextField.render.test.ts`,
 * d'où `createElement` plutôt que du JSX.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import Stepper from "./Stepper";
import type { StepperProps } from "./Stepper.type";

const render = (props: StepperProps = {}) => renderToStaticMarkup(createElement(Stepper, props));

/**
 * Compte les occurrences d'une classe de module. Les noms sont hachés au build
 * (`_stepper__segment_a1b2c3`), d'où la recherche sur le motif plutôt que sur la
 * chaîne exacte. `stepper__segment` ne capture pas `stepper__segment--filled` :
 * le suffixe `--` n'est pas le `_` attendu par le motif.
 */
const countClass = (html: string, name: string) =>
	(html.match(new RegExp(`_${name}_[A-Za-z0-9]+`, "g")) ?? []).length;

const attr = (html: string, name: string): string | undefined =>
	html.match(new RegExp(`${name}="([^"]*)"`))?.[1];

describe("variante line", () => {
	it("rend six segments par défaut", () => {
		expect(countClass(render(), "stepper__segment")).toBe(6);
	});

	it("remplit autant de segments que l'étape courante", () => {
		const html = render({ activeStep: 4 });

		expect(countClass(html, "stepper__segment")).toBe(6);
		expect(countClass(html, "stepper__segment--filled")).toBe(4);
	});

	it("ne remplit aucun segment de trop à la dernière étape", () => {
		expect(countClass(render({ activeStep: 6 }), "stepper__segment--filled")).toBe(6);
	});

	it("expose la progression via `role=progressbar`", () => {
		const html = render({ activeStep: 4 });

		expect(html).toContain('role="progressbar"');
		expect(attr(html, "aria-valuemin")).toBe("1");
		expect(attr(html, "aria-valuemax")).toBe("6");
		expect(attr(html, "aria-valuenow")).toBe("4");
		expect(attr(html, "aria-valuetext")).toBe("4/6");
	});

	it("masque le compteur visible pour ne pas l'annoncer deux fois", () => {
		// La valeur passe déjà par `aria-valuetext` sur le `progressbar`.
		expect(render({ activeStep: 3 })).toContain('aria-hidden="true">3/6<');
	});

	it("n'affiche le bouton retour que sur demande", () => {
		expect(render()).not.toContain("<button");
		expect(render({ hasButton: true })).toContain('aria-label="Étape précédente"');
	});

	it("honore un libellé de retour fourni", () => {
		const html = render({ hasButton: true, backLabel: "Revenir au projet" });

		expect(html).toContain('aria-label="Revenir au projet"');
	});

	it("garde le bouton retour hors du `progressbar`", () => {
		// Un `progressbar` ne doit pas embarquer d'élément interactif : le bouton est
		// donc un frère de la barre, rendu avant elle.
		const html = render({ hasButton: true });

		expect(html.indexOf("<button")).toBeLessThan(html.indexOf('role="progressbar"'));
	});
});

describe("variante number", () => {
	const number = (props: StepperProps = {}) => render({ variant: "number", ...props });

	it("rend une liste ordonnée de quatre étapes par défaut", () => {
		const html = number();

		expect(html).toContain("<ol");
		expect((html.match(/<li/g) ?? []).length).toBe(4);
	});

	it("marque une seule étape courante", () => {
		const html = number({ activeStep: 2 });

		expect((html.match(/aria-current="step"/g) ?? []).length).toBe(1);
	});

	it("répartit les états autour de l'étape courante", () => {
		const html = number({ activeStep: 3 });

		expect(countClass(html, "stepper__bullet--done")).toBe(2);
		expect(countClass(html, "stepper__bullet--current")).toBe(1);
		expect(countClass(html, "stepper__bullet--upcoming")).toBe(1);
	});

	it("relie les étapes par un trait de moins qu'il n'y a d'étapes", () => {
		expect(countClass(number(), "stepper__connectorLine")).toBe(3);
	});

	it("n'affiche le libellé qu'au-dessus de l'étape courante", () => {
		const html = number({ activeStep: 2, label: "Vos informations" });

		// Une fois en visible, une fois dans le texte `sr-only` de cette même étape.
		expect((html.match(/Vos informations/g) ?? []).length).toBe(2);
		expect(countClass(html, "stepper__label")).toBe(1);
	});

	it("décrit chaque étape aux lecteurs d'écran", () => {
		const html = number({ activeStep: 2, label: "Vos informations" });

		expect(html).toContain("Étape 1 sur 4, terminée");
		expect(html).toContain("Étape 2 sur 4 : Vos informations, en cours");
		expect(html).toContain("Étape 3 sur 4, à venir");
	});

	it("rend les pastilles décoratives, l'état passant par le texte `sr-only`", () => {
		// La coche n'a pas de texte et le numéro seul n'énoncerait pas l'état.
		const html = number({ activeStep: 2 });

		expect(html).toContain('aria-hidden="true"');
		expect(html).toContain("<svg");
	});
});

describe("bornes", () => {
	it("borne l'étape courante au nombre d'étapes", () => {
		expect(attr(render({ activeStep: 99 }), "aria-valuenow")).toBe("6");
		expect(attr(render({ activeStep: 0 }), "aria-valuenow")).toBe("1");
		expect(attr(render({ activeStep: -3 }), "aria-valuenow")).toBe("1");
	});

	it("applique le nombre d'étapes par défaut propre à chaque variante", () => {
		expect(countClass(render({ variant: "line" }), "stepper__segment")).toBe(6);
		expect((render({ variant: "number" }).match(/<li/g) ?? []).length).toBe(4);
	});

	it("accepte un nombre d'étapes personnalisé", () => {
		expect(countClass(render({ totalSteps: 3, activeStep: 2 }), "stepper__segment")).toBe(3);
		expect(attr(render({ totalSteps: 3, activeStep: 2 }), "aria-valuetext")).toBe("2/3");
		expect((render({ variant: "number", totalSteps: 6 }).match(/<li/g) ?? []).length).toBe(6);
	});
});

describe("rendu SSR", () => {
	it("ne touche ni `document` ni `window`", () => {
		// `environment: "node"` : l'absence de ces globales est le test lui-même.
		expect(() => render({ hasButton: true })).not.toThrow();
		expect(() => render({ variant: "number", label: "Vos informations" })).not.toThrow();
	});
});
