/*
 * Contrat de rendu de `ConfirmationCard`.
 *
 * Rendu SSR (`environment: node`) : c'est aussi la garantie que le composant est
 * consommable en Island Jahia, où GraalVM n'offre ni `document` ni `window`.
 *
 * Ce qui est vérifié ici est ce qui casse en silence : le lien `aria-labelledby`
 * entre la carte et son titre, le retrait du visuel de l'arbre d'accessibilité
 * (sans quoi un lecteur d'écran annoncerait deux images muettes), et le fait que
 * les puces de réassurance soient rendues sans configuration.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ConfirmationCard, { DEFAULT_REASSURANCES } from "./ConfirmationCard";
import type { ConfirmationCardProps } from "./confirmationCard.types";

const render = (props: Partial<ConfirmationCardProps> = {}) =>
	renderToStaticMarkup(createElement(ConfirmationCard, { title: "Demande envoyée", ...props }));

const countClass = (html: string, name: string) =>
	(html.match(new RegExp(`_${name}_[A-Za-z0-9]+`, "g")) ?? []).length;

describe("contenu piloté par Jahia", () => {
	it("rend le titre reçu en props", () => {
		expect(render()).toContain("Demande envoyée");
	});

	it("rend le message quand il est fourni", () => {
		const html = render({ message: "Merci, nous avons bien reçu votre demande." });

		expect(html).toContain("Merci, nous avons bien reçu votre demande.");
	});

	it("n'insère aucun paragraphe vide sans message", () => {
		expect(countClass(render(), "confirmation-card__message")).toBe(0);
	});

	it("rend les renvois de notes du titre en vrais `sup`", () => {
		expect(render({ title: "Demande envoyée⁽¹⁾" })).toContain('<sup class="footer-ref">(1)</sup>');
	});
});

describe("réassurances", () => {
	it("rend les trois puces du parcours partenaire sans configuration", () => {
		const html = render();

		for (const { label } of DEFAULT_REASSURANCES) expect(html).toContain(label);
	});

	it("rend la liste fournie à la place de celle par défaut", () => {
		const html = render({ reassurances: [{ icon: "check", label: "Dossier complet" }] });

		expect(html).toContain("Dossier complet");
		expect(html).not.toContain(DEFAULT_REASSURANCES[0].label);
	});

	it("ne rend aucune liste quand elle est vide", () => {
		expect(countClass(render({ reassurances: [] }), "confirmation-card__reassurances")).toBe(0);
	});
});

describe("accessibilité", () => {
	it("nomme la carte par son titre", () => {
		const html = render();
		const labelledBy = html.match(/aria-labelledby="([^"]*)"/)?.[1];

		expect(labelledBy).toBeDefined();
		expect(html).toContain(`id="${labelledBy}"`);
	});

	it("retire l'illustration de l'arbre d'accessibilité", () => {
		expect(render()).toMatch(/<div class="[^"]*confirmation-card__visual[^"]*" aria-hidden="true"/);
	});
});
