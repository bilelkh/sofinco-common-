/*
 * Contrat de rendu de `FormHero`.
 *
 * Rendu SSR (`environment: node`) : c'est aussi la garantie que le composant est
 * consommable en Island Jahia, où GraalVM n'offre ni `document` ni `window`.
 *
 * Le bandeau n'a presque pas de logique — ce qui est vérifié ici est justement ce
 * qui casse en silence : le niveau du titre (une page qui perd son `h1`), le lien
 * `aria-labelledby` entre la section et son titre, et le fait que l'emplacement
 * chevauchant ne soit pas rendu à vide.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import FormHero from "./FormHero";
import type { FormHeroProps } from "./formHero.types";

const render = (props: Partial<FormHeroProps> = {}) =>
	renderToStaticMarkup(
		createElement(FormHero, { title: "Devenez Partenaire Sofinco", ...props }),
	);

const countClass = (html: string, name: string) =>
	(html.match(new RegExp(`_${name}_[A-Za-z0-9]+`, "g")) ?? []).length;

describe("contenu piloté par Jahia", () => {
	it("rend le titre reçu en props", () => {
		expect(render()).toContain("Devenez Partenaire Sofinco");
	});

	it("rend l'accroche quand elle est fournie", () => {
		const html = render({ subtitle: "Proposez le financement Sofinco à vos clients." });

		expect(html).toContain("Proposez le financement Sofinco à vos clients.");
	});

	it("n'insère aucun paragraphe vide sans accroche", () => {
		expect(countClass(render(), "subtitle")).toBe(0);
	});
});

describe("hiérarchie de titres", () => {
	it("ouvre la page en h1 par défaut", () => {
		expect(render()).toMatch(/<h1[^>]*>Devenez Partenaire Sofinco<\/h1>/);
	});

	it("peut descendre en h2 quand la page porte déjà son h1", () => {
		expect(render({ titleAs: "h2" })).toMatch(/<h2[^>]*>/);
	});

	it("conserve l'habillage visuel du h1 quel que soit le niveau", () => {
		expect(countClass(render({ titleAs: "h2" }), "title--h2")).toBeGreaterThan(0);
	});
});

describe("accessibilité", () => {
	it("nomme la section par son titre", () => {
		const html = render();
		const labelledBy = html.match(/aria-labelledby="([^"]*)"/)?.[1];

		expect(labelledBy).toBeDefined();
		expect(html).toContain(`id="${labelledBy}"`);
	});
});

describe("emplacement chevauchant", () => {
	it("n'est pas rendu sans contenu — pas de boîte vide sous le bandeau", () => {
		expect(countClass(render(), "form-hero__slot")).toBe(0);
	});

	it("accueille le contenu fourni", () => {
		const html = render({ children: createElement("p", null, "Formulaire") });

		expect(countClass(html, "form-hero__slot")).toBe(1);
		expect(html).toContain("Formulaire");
	});
});
