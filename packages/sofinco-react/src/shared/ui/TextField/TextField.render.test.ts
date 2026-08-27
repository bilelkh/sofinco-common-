/*
 * Contrat de rendu de `TextField`.
 *
 * Ce qui est vérifié ici est ce dont dépendent les lecteurs d'écran : le lien
 * `<label for>` ↔ `<input id>`, et le `aria-describedby` qui rattache l'aide ou
 * l'erreur au champ. Ces identifiants sont générés (`useId`) : aucun test
 * visuel ne les couvre, et une régression y est silencieuse.
 *
 * Écrit en `.ts` et non `.tsx` pour rester aligné sur `FootnoteText.render.test.ts`,
 * d'où `createElement` plutôt que du JSX.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import TextField from "./TextField";
import type { TextFieldProps } from "./TextField.type";

const render = (props: TextFieldProps) => renderToStaticMarkup(createElement(TextField, props));

/** `id` d'un attribut donné, pour recouper `for` / `id` / `aria-describedby`. */
const attr = (html: string, name: string): string | undefined =>
	html.match(new RegExp(`${name}="([^"]*)"`))?.[1];

describe("liaison libellé ↔ champ", () => {
	it("relie le `for` du label à l'`id` de l'input", () => {
		const html = render({ label: "Adresse e-mail" });

		const htmlFor = attr(html, "for");
		const id = attr(html, "id");

		expect(htmlFor).toBeTruthy();
		expect(id).toBe(htmlFor);
	});

	it("honore un `id` fourni plutôt que celui généré", () => {
		const html = render({ label: "Adresse e-mail", id: "email" });

		expect(attr(html, "for")).toBe("email");
		expect(html).toContain('id="email"');
	});

	it("garde le libellé dans le DOM quand `hideLabel` est posé", () => {
		const html = render({ label: "Adresse e-mail", hideLabel: true });

		expect(html).toContain("Adresse e-mail");
		expect(attr(html, "for")).toBe(attr(html, "id"));
	});
});

describe("aide et erreur", () => {
	it("rattache le texte d'aide au champ", () => {
		const html = render({ label: "E-mail", hint: "Format attendu : nom@domaine.fr" });

		const hintId = html.match(/<p[^>]*id="([^"]*)"/)?.[1];

		expect(hintId).toBeTruthy();
		expect(attr(html, "aria-describedby")).toBe(hintId);
	});

	it("bascule en erreur sur la seule présence d'`errorMessage`", () => {
		const html = render({ label: "E-mail", errorMessage: "Adresse invalide." });

		expect(html).toContain('aria-invalid="true"');
		expect(html).toContain('role="alert"');
		expect(html).toContain("Adresse invalide.");
	});

	it("marque le champ invalide sans message quand `invalid` est seul", () => {
		const html = render({ label: "E-mail", invalid: true });

		expect(html).toContain('aria-invalid="true"');
		// Pas de message : rien à annoncer, donc pas de `role="alert"` vide ni de
		// `aria-describedby` pointant sur un nœud absent.
		expect(html).not.toContain('role="alert"');
		expect(html).not.toContain("aria-describedby");
	});

	it("remplace l'aide par l'erreur au lieu de les empiler", () => {
		const html = render({
			label: "E-mail",
			hint: "Format attendu : nom@domaine.fr",
			errorMessage: "Adresse invalide.",
		});

		expect(html).not.toContain("Format attendu");
		// `aria-describedby` ne pointe plus que sur le message d'erreur.
		expect(attr(html, "aria-describedby")).toMatch(/-error$/);
	});

	it("préserve un `aria-describedby` fourni par le consommateur", () => {
		const html = render({
			label: "E-mail",
			hint: "Format attendu : nom@domaine.fr",
			"aria-describedby": "cgu",
		});

		expect(attr(html, "aria-describedby")).toMatch(/^cgu .+-hint$/);
	});

	it("n'émet pas d'`aria-describedby` vide sans aide ni erreur", () => {
		const html = render({ label: "E-mail" });

		expect(html).not.toContain("aria-describedby");
	});
});

describe("bouton effacer", () => {
	it("reste absent tant que le champ est vide", () => {
		const html = render({ label: "E-mail", clearable: true });

		expect(html).not.toContain("<button");
	});

	it("apparaît dès que le champ porte une valeur", () => {
		const html = render({ label: "E-mail", clearable: true, defaultValue: "a@b.fr" });

		expect(html).toContain('aria-label="Effacer le champ"');
	});

	it("cède la place à l'icône d'alerte en état d'erreur", () => {
		const html = render({
			label: "E-mail",
			clearable: true,
			defaultValue: "a@b.fr",
			invalid: true,
		});

		expect(html).not.toContain("<button");
		expect(html).toContain("lucide-circle-alert");
	});

	it("ne pose aucune icône d'état sur un champ désactivé", () => {
		const html = render({
			label: "E-mail",
			clearable: true,
			defaultValue: "a@b.fr",
			disabled: true,
		});

		expect(html).not.toContain("lucide-lock");
		expect(html).not.toContain("lucide-circle-alert");
	});

	it("laisse `trailingIcon` en place sur un champ désactivé", () => {
		const html = render({ label: "E-mail", trailingIcon: "mail", disabled: true });

		expect(html).toContain("lucide-mail");
	});

	it("s'efface sur un champ désactivé ou en lecture seule", () => {
		const disabled = render({
			label: "E-mail",
			clearable: true,
			defaultValue: "a@b.fr",
			disabled: true,
		});
		const readOnly = render({
			label: "E-mail",
			clearable: true,
			defaultValue: "a@b.fr",
			readOnly: true,
		});

		expect(disabled).not.toContain("<button");
		expect(readOnly).not.toContain("<button");
	});
});

describe("masque de saisie", () => {
	/*
	 * Le masque ne vit qu'à l'affichage : c'est le contrat sur lequel reposent les
	 * règles de validation du formulaire (`/^\d{14}$/`) et les services aval, qui
	 * ne voient jamais les séparateurs.
	 */
	it("groupe la valeur affichée sans toucher à la valeur reçue", () => {
		const siret = render({ label: "Siret", mask: "siret", value: "32476789990963" });
		const phone = render({ label: "Téléphone", mask: "phone", value: "0612345678" });

		expect(siret).toContain('value="324 767 899 90963"');
		expect(phone).toContain('value="06 12 34 56 78"');
	});

	it("accepte une valeur déjà ponctuée sans la doubler", () => {
		expect(render({ label: "Téléphone", mask: "phone", value: "06.12.34.56.78" })).toContain(
			'value="06 12 34 56 78"',
		);
	});

	it("laisse le gabarit borner la saisie, sans `maxLength`", () => {
		/*
		 * `maxLength` tronquerait le texte AVANT que la bibliothèque ne le voie : un
		 * collage `+33 6 12 34 56 78` serait coupé au 14e caractère, donc au milieu
		 * des chiffres. Le gabarit borne déjà la saisie, celui du consommateur est
		 * donc écarté.
		 */
		expect(render({ label: "Siret", mask: "siret" })).not.toContain("maxLength");
		expect(render({ label: "Téléphone", mask: "phone", maxLength: 10 })).not.toContain("maxLength");
	});

	it("laisse `maxLength` intact sans masque", () => {
		expect(render({ label: "Nom", maxLength: 10 })).toContain('maxLength="10"');
	});
});

describe("rendu SSR", () => {
	it("ne touche ni `document` ni `window`", () => {
		// `environment: "node"` : l'absence de ces globales est le test lui-même.
		expect(() => render({ label: "E-mail", icon: "search", clearable: true })).not.toThrow();
	});
});
