/*
 * Contrat de rendu de `Textarea`.
 *
 * Le câblage libellé / aide / erreur vient de `useField` et est déjà couvert par
 * `TextField.render.test.ts` : on ne le revérifie ici qu'en surface (un champ
 * relié, une erreur annoncée). Le reste porte sur ce qui est propre au
 * multiligne — hauteur, redimensionnement, compteur.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import Textarea from "./Textarea";
import type { TextareaProps } from "./Textarea.type";

const render = (props: TextareaProps) => renderToStaticMarkup(createElement(Textarea, props));

const attr = (html: string, name: string): string | undefined =>
	html.match(new RegExp(`${name}="([^"]*)"`))?.[1];

describe("câblage hérité de `useField`", () => {
	it("relie le `for` du label au `<textarea>`", () => {
		const html = render({ label: "Message" });

		expect(html).toContain("<textarea");
		expect(attr(html, "for")).toBe(attr(html, "id"));
	});

	it("annonce l'erreur et marque le champ invalide", () => {
		const html = render({ label: "Message", errorMessage: "Champ requis." });

		expect(html).toContain('aria-invalid="true"');
		expect(html).toContain('role="alert"');
		expect(attr(html, "aria-describedby")).toMatch(/-error$/);
	});
});

describe("hauteur et redimensionnement", () => {
	it("pose 4 lignes par défaut", () => {
		expect(render({ label: "Message" })).toContain('rows="4"');
	});

	it("honore un `rows` explicite", () => {
		expect(render({ label: "Message", rows: 8 })).toContain('rows="8"');
	});

	it("verrouille la poignée avec `resize=\"none\"`", () => {
		const fixed = render({ label: "Message", resize: "none" });
		const free = render({ label: "Message" });

		// La classe est hachée : on compare les deux rendus plutôt que de coder en
		// dur un nom de classe que le bundler réécrit.
		expect(fixed).not.toBe(free);
		expect(fixed.match(/class="[^"]*"/g)?.join()).toMatch(/textarea--fixed/);
		expect(free.match(/class="[^"]*"/g)?.join()).not.toMatch(/textarea--fixed/);
	});
});

describe("compteur", () => {
	it("reste absent tant que `showCounter` n'est pas demandé", () => {
		expect(render({ label: "Message", maxLength: 100 })).not.toContain("/ 100");
	});

	it("compte la valeur courante face à `maxLength`", () => {
		const html = render({
			label: "Message",
			maxLength: 100,
			showCounter: true,
			defaultValue: "douze",
		});

		expect(html).toContain("5 / 100");
	});

	it("s'efface sans `maxLength` plutôt que d'afficher une borne absente", () => {
		const html = render({ label: "Message", showCounter: true, defaultValue: "douze" });

		expect(html).not.toContain("undefined");
		expect(html).not.toMatch(/5\s*\/\s*/);
	});
});

describe("icônes d'état", () => {
	it("ne pose aucune icône d'état sur un champ désactivé", () => {
		expect(render({ label: "Message", disabled: true })).not.toContain("lucide-lock");
	});

	it("affiche l'alerte en erreur", () => {
		expect(render({ label: "Message", invalid: true })).toContain("lucide-circle-alert");
	});
});

describe("rendu SSR", () => {
	it("ne touche ni `document` ni `window`", () => {
		expect(() =>
			render({ label: "Message", showCounter: true, maxLength: 50, invalid: true }),
		).not.toThrow();
	});
});
