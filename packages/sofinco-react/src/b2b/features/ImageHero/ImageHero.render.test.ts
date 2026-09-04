/*
 * Contrat de rendu de `ImageHero`.
 *
 * Rendu SSR (`environment: node`) : c'est aussi la garantie que le composant est
 * consommable en Island Jahia, où GraalVM n'offre ni `document` ni `window`.
 *
 * Ce qui est vérifié ici échappe à tout test visuel :
 *
 *  - **la photo décorative et prioritaire** — `alt=""` + `aria-hidden`, chargée en
 *    `eager` / `fetchPriority="high"` parce qu'elle est l'élément LCP ;
 *  - **le voile masqué aux technologies d'assistance**, et son retrait sur demande ;
 *  - **le fil d'Ariane forcé en `onDark`**, quel que soit le thème contribué ;
 *  - **les blocs optionnels** (accroche, bouton, fil d'Ariane) qui n'émettent rien
 *    plutôt qu'un élément vide.
 *
 * Écrit en `.ts` et non `.tsx`, comme `PartnerLogos.render.test.ts`, d'où
 * `createElement` plutôt que du JSX.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ImageHero from "./ImageHero";
import type { ImageHeroProps } from "./ImageHero.type";

const BREADCRUMB: ImageHeroProps["breadcrumb"] = {
	items: [
		{ id: "home", label: "Accueil Solution Pro", url: "/pro", isCurrent: false, isClickable: true },
		{ id: "renovation", label: "Rénovation", url: "", isCurrent: true, isClickable: false },
	],
};

const render = (props: Partial<ImageHeroProps> = {}) =>
	renderToStaticMarkup(
		createElement(ImageHero, {
			title: "Professionnels de la rénovation",
			subtitle: "Des solutions de paiement adaptées à votre métier",
			image: { src: "/hero.webp" },
			cta: { label: "Nous contacter", href: "/contact" },
			breadcrumb: BREADCRUMB,
			...props,
		}),
	);

describe("ImageHero", () => {
	it("nomme la section par son titre, rendu en h1 par défaut", () => {
		const html = render();
		const labelledBy = html.match(/aria-labelledby="([^"]+)"/)?.[1];

		expect(labelledBy).toBeDefined();
		expect(html).toMatch(new RegExp(`<h1[^>]*id="${labelledBy}"`));
		expect(html).toContain("Professionnels de la rénovation");
	});

	it("rend le titre en h2 sur demande", () => {
		const html = render({ titleAs: "h2" });

		expect(html).toContain("<h2");
		expect(html).not.toContain("<h1");
	});

	it("rend la photo décorative et prioritaire, aux dimensions du gabarit à défaut", () => {
		const html = render();

		expect(html).toContain('src="/hero.webp"');
		expect(html).toContain('alt="" aria-hidden="true"');
		expect(html).toContain('loading="eager"');
		/* React 19 sérialise `fetchPriority` en camelCase : comparaison insensible à la casse. */
		expect(html).toMatch(/fetchpriority="high"/i);
		expect(html).toContain('width="1440"');
		expect(html).toContain('height="741"');
	});

	it("transmet les dimensions et les sources art-directed du visuel", () => {
		const html = render({
			image: {
				src: "/hero.webp",
				width: 1628,
				height: 812,
				sources: [{ srcSet: "/hero-mobile.webp", media: "(max-width: 767px)" }],
			},
		});

		expect(html).toContain("<picture");
		expect(html).toMatch(/srcset="\/hero-mobile\.webp"/i);
		expect(html).toContain('width="1628"');
		expect(html).toContain('height="812"');
	});

	it("pose un voile masqué aux technologies d'assistance, retiré sur demande", () => {
		const withOverlay = render();
		const overlays = withOverlay.match(/<div[^>]*aria-hidden="true"[^>]*><\/div>/g);
		expect(overlays).toHaveLength(1);

		const withoutOverlay = render({ overlay: false });
		expect(withoutOverlay.match(/<div[^>]*aria-hidden="true"[^>]*><\/div>/g)).toBeNull();
	});

	it("rend le fil d'Ariane en onDark, quel que soit le thème contribué", () => {
		const html = render({ breadcrumb: { items: BREADCRUMB.items, theme: "onLight" } });

		expect(html).toContain("<nav");
		expect(html).toContain('data-theme="onDark"');
		expect(html).not.toContain('data-theme="onLight"');
		expect(html).toContain('href="/pro"');
		expect(html).toContain('aria-current="page"');
	});

	it("ne rend aucun fil d'Ariane sans items", () => {
		expect(render({ breadcrumb: undefined })).not.toContain("<nav");
		expect(render({ breadcrumb: { items: [] } })).not.toContain("<nav");
	});

	it("rend le bouton en lien, et rien sans libellé ou sans cible", () => {
		const html = render();

		expect(html).toMatch(/<a[^>]*href="\/contact"[^>]*>[\s\S]*Nous contacter/);

		expect(render({ cta: undefined })).not.toContain("Nous contacter");
		expect(render({ cta: { label: "Nous contacter" } })).not.toContain("Nous contacter");
		expect(render({ cta: { href: "/contact" } })).not.toContain('href="/contact"');
	});

	it("n'émet pas d'accroche vide", () => {
		const html = render({ subtitle: undefined });

		/* `<p` suivi d'un délimiteur : `<path` de l'icône du bouton ne doit pas compter. */
		expect(html).not.toMatch(/<p[\s>]/);
	});
});
