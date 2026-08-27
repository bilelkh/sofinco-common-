/*
 * Contrat de rendu de la variante B2B du menu (site vitrine Professionnels).
 *
 * Rendu SSR (`environment: node`) : c'est aussi la garantie que le menu reste
 * consommable en Island Jahia, où GraalVM n'offre ni `document` ni `window`.
 *
 * Ce qui est vérifié ici, c'est le peu de LOGIQUE que la variante ajoute — le
 * reste (couleurs, gouttières, colonnes) est du CSS et ne se teste pas ainsi :
 *
 * 1. `data-brand` est bien posé sur le header ET sur la barre supérieure : c'est
 *    l'unique point d'accroche de tout le thème B2B, et rien ne le signalerait
 *    s'il disparaissait — le menu se contenterait de repasser en blanc.
 * 2. Une rubrique sans panneau (`href` + `subsections: []`) rend un LIEN, pas un
 *    bouton : rendue en bouton, elle ouvrirait un panneau vide au survol.
 * 3. Le B2C, lui, ne change pas : sans `variant`, `data-brand` vaut `b2c` et
 *    toutes ses rubriques restent des boutons de panneau.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import Menu from "./Menu";
import type { MenuProps, MenuSection } from "./Menu.type";

const logo = { src: "/logo.svg", alt: "Sofinco", label: "Accueil Sofinco", href: "/" };

const panelSection: MenuSection = {
	id: "ressources",
	title: "Ressources",
	subsections: [
		{ id: "r", title: "Ressources", links: [{ label: "Actualités", href: "/actualites" }] },
	],
};

const linkSection: MenuSection = {
	id: "tarifs",
	title: "Tarifs",
	href: "/professionnels/tarifs",
	isActive: true,
	subsections: [],
};

const render = (props: Partial<MenuProps> = {}) =>
	renderToStaticMarkup(
		createElement(Menu, {
			logo,
			sections: [panelSection, linkSection],
			topBarProps: { tabs: [{ href: "/", label: "Particuliers" }] },
			...props,
		}),
	);

describe("variante de marque", () => {
	it("marque le header et la barre supérieure en b2b", () => {
		expect(render({ variant: "b2b" }).match(/data-brand="b2b"/g)).toHaveLength(2);
	});

	it("retombe sur b2c quand la variante n'est pas fournie", () => {
		const html = render();

		expect(html).toContain('data-brand="b2c"');
		expect(html).not.toContain('data-brand="b2b"');
	});
});

describe("rubrique sans panneau", () => {
	it("rend un lien vers sa destination", () => {
		expect(render({ variant: "b2b" })).toContain('href="/professionnels/tarifs"');
	});

	it("signale la page courante", () => {
		expect(render({ variant: "b2b" })).toContain('aria-current="page"');
	});

	it("laisse les rubriques à panneau en boutons", () => {
		// Une seule des deux rubriques est un bouton : « Ressources ».
		expect(render({ variant: "b2b" }).match(/<button/g)).toHaveLength(1);
	});
});

describe("CTA principal", () => {
	it("rend le CTA « Devenir partenaire » quand il est fourni", () => {
		const html = render({
			variant: "b2b",
			ctaPrimary: { label: "Devenir partenaire", href: "/devenir-partenaire" },
		});

		expect(html).toContain("Devenir partenaire");
		expect(html).toContain('href="/devenir-partenaire"');
	});

	it("n'insère rien quand il n'est pas fourni", () => {
		expect(render({ variant: "b2b" })).not.toContain("Devenir partenaire");
	});
});
