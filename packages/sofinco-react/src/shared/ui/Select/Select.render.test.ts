/*
 * Contrat de rendu de `Select`.
 *
 * Deux choses valent d'être verrouillées ici : le miroir natif caché, sans
 * lequel un formulaire posté avant hydratation perdrait la valeur — c'est la
 * raison d'être de ce composant plutôt qu'un listbox seul — et le rendu serveur
 * lui-même (le DS est consommé en Island Jahia, sous GraalVM : ni `document` ni
 * `window`).
 *
 * Le panneau n'est monté qu'à l'ouverture : son contenu et la navigation
 * clavier relèvent de `useSelectKeyboard.test.ts` et d'un test navigateur.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import Select from "./Select";
import type { SelectOption, SelectProps } from "./Select.type";

const OPTIONS: SelectOption[] = [
	{ value: "perso", label: "Prêt personnel" },
	{ value: "auto", label: "Crédit auto" },
	{ value: "rachat", label: "Rachat de crédits", disabled: true },
];

const render = (props: SelectProps) => renderToStaticMarkup(createElement(Select, props));

const attr = (html: string, name: string): string | undefined =>
	html.match(new RegExp(`${name}="([^"]*)"`))?.[1];

describe("déclencheur", () => {
	it("rend un combobox relié au libellé", () => {
		const html = render({ label: "Projet", options: OPTIONS });

		expect(html).toContain('role="combobox"');
		expect(html).toContain('aria-haspopup="listbox"');

		// Le `<label>` porte lui aussi un `id` (le listbox s'y réfère) : on vise
		// donc explicitement le bouton, et non le premier `id` venu.
		const htmlFor = attr(html, "for");
		expect(htmlFor).toBeTruthy();
		expect(html).toMatch(new RegExp(`<button[^>]*\\bid="${htmlFor}"`));
	});

	it("est fermé au rendu initial", () => {
		const html = render({ label: "Projet", options: OPTIONS });

		expect(html).toContain('aria-expanded="false"');
		// Panneau non monté : ni listbox, ni libellés d'options dans le HTML servi.
		expect(html).not.toContain('role="listbox"');
		expect(html).not.toContain('role="option"');
	});

	it("porte `aria-invalid` et `aria-describedby` en erreur", () => {
		const html = render({ label: "Projet", options: OPTIONS, errorMessage: "Choix requis." });

		expect(html).toContain('aria-invalid="true"');
		expect(attr(html, "aria-describedby")).toMatch(/-error$/);
		expect(html).toContain('role="alert"');
	});

	it("expose `aria-required` sans champ natif visible", () => {
		const html = render({ label: "Projet", options: OPTIONS, required: true });

		expect(html).toContain('aria-required="true"');
	});
});

describe("valeur affichée", () => {
	it("montre le placeholder quand rien n'est sélectionné", () => {
		const html = render({ label: "Projet", options: OPTIONS, placeholder: "Choisir…" });

		expect(html).toContain("Choisir…");
	});

	it("montre le libellé de l'option sélectionnée", () => {
		const html = render({
			label: "Projet",
			options: OPTIONS,
			placeholder: "Choisir…",
			defaultValue: "auto",
		});

		expect(html).toContain("Crédit auto");
		expect(html).not.toContain("Choisir…");
	});

	it("retombe sur le placeholder si la valeur ne correspond à aucune option", () => {
		const html = render({
			label: "Projet",
			options: OPTIONS,
			placeholder: "Choisir…",
			defaultValue: "inconnu",
		});

		expect(html).toContain("Choisir…");
	});
});

describe("miroir natif — soumission de formulaire", () => {
	/*
	 * Le point qui a fait écarter une implémentation en listbox seule : ce champ
	 * porte la valeur DÈS le rendu serveur, donc un POST/GET HTML passe sans
	 * qu'aucun JavaScript n'ait tourné. `SimulatorForm` s'en sert déjà
	 * (`action` + `method="GET"`).
	 */
	it("porte `name` et la valeur choisie dès le rendu serveur", () => {
		const html = render({
			label: "Projet",
			options: OPTIONS,
			name: "projet",
			defaultValue: "auto",
		});

		expect(html).toMatch(/<select[^>]*name="projet"/);
		expect(html).toMatch(/<option value="auto" selected="">/);
	});

	it("liste toutes les options, groupes compris", () => {
		const html = render({
			label: "Projet",
			options: OPTIONS,
			groups: [{ label: "Autres", options: [{ value: "x", label: "Autre" }] }],
			name: "projet",
		});

		expect(html).toMatch(/<option value="x">/);
	});

	it("reste absent sans `name` — rien à soumettre", () => {
		const html = render({ label: "Projet", options: OPTIONS });

		expect(html).not.toContain("<select");
	});

	it("reporte `required` pour que la validation native s'applique", () => {
		const html = render({ label: "Projet", options: OPTIONS, name: "projet", required: true });

		expect(html).toMatch(/<select[^>]*required=""/);
	});
});

describe("icônes d'état", () => {
	it("garde le chevron en erreur — le champ reste manipulable", () => {
		const html = render({ label: "Projet", options: OPTIONS, invalid: true });

		expect(html).toContain("lucide-chevron-down");
		expect(html).not.toContain("lucide-lock");
	});

	it("garde le chevron sur un champ désactivé", () => {
		const html = render({ label: "Projet", options: OPTIONS, disabled: true });

		expect(html).toContain("lucide-chevron-down");
		expect(html).not.toContain("lucide-lock");
	});
});

describe("rendu SSR", () => {
	it("ne touche ni `document` ni `window` — contrainte GraalVM des Islands Jahia", () => {
		expect(() =>
			render({
				label: "Projet",
				options: OPTIONS,
				groups: [{ label: "Autres", options: [{ value: "x", label: "Autre" }] }],
				placeholder: "Choisir…",
				name: "projet",
				required: true,
				invalid: true,
				icon: "search",
			}),
		).not.toThrow();
	});
});
