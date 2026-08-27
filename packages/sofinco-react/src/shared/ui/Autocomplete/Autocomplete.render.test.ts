/*
 * Contrat de rendu d'`Autocomplete`.
 *
 * Rendu SSR (`environment: node`) : c'est aussi la garantie que le composant est
 * consommable en Island Jahia, où GraalVM n'offre ni `document` ni `window`. Un
 * champ qui chercherait au montage — plutôt qu'à la frappe — s'y verrait tout de
 * suite.
 *
 * Ce qui est vérifié ici échappe à tout test visuel :
 *
 *  - **le câblage ARIA du motif combobox** : `role`, `aria-autocomplete`, et un
 *    panneau qui n'existe pas tant qu'il n'est pas ouvert ;
 *  - **le champ fermé au premier rendu**, sans appel réseau ;
 *  - **le miroir caché**, qui porte le code et non le libellé affiché ;
 *  - **le contrat de `Field`** — libellé lié, aide et erreur décrites.
 *
 * Écrit en `.ts` et non `.tsx`, comme les autres tests de rendu du DS, d'où
 * `createElement` plutôt que du JSX.
 */
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import Autocomplete from "./Autocomplete";
import type { AutocompleteProps } from "./Autocomplete.type";

/** Source inerte : aucun rendu SSR ne doit la solliciter. */
const noSearch: AutocompleteProps["onSearch"] = async () => [];

const render = (props: Partial<AutocompleteProps> = {}) =>
	renderToStaticMarkup(
		createElement(Autocomplete, {
			label: "Code postal",
			onSearch: noSearch,
			...props,
		} as AutocompleteProps),
	);

describe("Autocomplete — rendu serveur", () => {
	it("rend un combobox complété par liste, refermé", () => {
		const html = render();

		expect(html).toContain('role="combobox"');
		// `list` et non `both` : la liste ne réécrit jamais la saisie.
		expect(html).toContain('aria-autocomplete="list"');
		expect(html).toContain('aria-expanded="false"');
	});

	it("ne monte pas le panneau tant qu'il n'est pas ouvert", () => {
		const html = render();

		expect(html).not.toContain('role="listbox"');
		// Fermé, le champ ne pilote aucun panneau : l'attribut pointerait dans le vide.
		expect(html).not.toContain("aria-controls");
	});

	it("n'interroge pas la source au montage", () => {
		const onSearch = vi.fn(noSearch);

		render({ onSearch, defaultLabel: "LILLE (59800)" });

		// La recherche part à la frappe, jamais au rendu — sans quoi une page
		// portant dix champs déclencherait dix appels à l'affichage.
		expect(onSearch).not.toHaveBeenCalled();
	});

	it("lie le libellé au champ", () => {
		const html = render({ id: "cp" });

		expect(html).toContain('for="cp"');
		expect(html).toContain('id="cp"');
	});

	it("affiche le libellé d'amorçage, pas la valeur soumise", () => {
		// Le champ montre la commune ; c'est le code qui part au serveur.
		const html = render({ defaultLabel: "LILLE (59800)", value: "59800", name: "codePostal" });

		expect(html).toContain('value="LILLE (59800)"');
		expect(html).toContain('<input type="hidden" name="codePostal" value="59800"/>');
	});

	it("ne rend le miroir caché que si un `name` le réclame", () => {
		expect(render({ value: "59800" })).not.toContain('type="hidden"');
	});

	it("porte l'obligation sur le champ", () => {
		const html = render({ required: true });

		expect(html).toContain('aria-required="true"');
	});

	it("décrit l'aide, et la remplace par l'erreur le moment venu", () => {
		const withHint = render({ id: "cp", hint: "Code postal ou commune" });
		expect(withHint).toContain('id="cp-hint"');
		expect(withHint).toContain('aria-describedby="cp-hint"');

		const withError = render({
			id: "cp",
			hint: "Code postal ou commune",
			errorMessage: "Choisissez une commune dans la liste.",
		});
		// Deux textes concurrents sous le même champ se liraient mal : l'aide cède.
		expect(withError).not.toContain('id="cp-hint"');
		expect(withError).toContain('aria-describedby="cp-error"');
		expect(withError).toContain('aria-invalid="true"');
		expect(withError).toContain('role="alert"');
	});

	it("désactive le champ sans laisser de bouton d'effacement actionnable", () => {
		const html = render({ disabled: true, defaultLabel: "LILLE (59800)" });

		expect(html).toContain("disabled=\"\"");
		expect(html).not.toContain("Effacer le champ");
	});

	it("laisse le bouton d'effacement dès que le champ porte un texte", () => {
		expect(render({ defaultLabel: "LILLE (59800)" })).toContain('aria-label="Effacer le champ"');
		expect(render()).not.toContain('aria-label="Effacer le champ"');
	});

	/*
	 * Le champ se présente comme un `TextField`, pas comme un `Select` : ni loupe en
	 * tête, ni chevron en fin. Un chevron promet une liste dépliable ; ici il n'y a rien
	 * à déplier tant que rien n'est tapé.
	 */
	it("ne pose aucune icône de tête par défaut", () => {
		expect(render()).not.toContain("lucide-search");
	});

	it("ne porte pas le chevron de `Select`", () => {
		expect(render()).not.toContain("lucide-chevron-down");
	});

	it("laisse la fin de champ nue en erreur — bordure et message la portent", () => {
		const html = render({ errorMessage: "Choisissez une commune dans la liste." });

		expect(html).not.toContain("lucide-chevron-down");
		expect(html).not.toContain("lucide-circle-alert");
	});

	it("laisse la fin de champ nue une fois désactivé", () => {
		const html = render({ disabled: true });

		expect(html).not.toContain("lucide-chevron-down");
		expect(html).not.toContain("lucide-lock");
	});

	it("accepte malgré tout une icône de tête explicite", () => {
		expect(render({ icon: "search" })).toContain("lucide-search");
	});

	it("n'émet pas d'autocomplétion navigateur, qui doublerait le panneau", () => {
		// Comparaison insensible à la casse : React 19 rend `autoComplete` tel
		// quel côté serveur, et c'est l'analyseur HTML — pour qui un nom
		// d'attribut n'a pas de casse — qui le ramène à `autocomplete`.
		expect(render()).toMatch(/autocomplete="off"/i);
	});
});
