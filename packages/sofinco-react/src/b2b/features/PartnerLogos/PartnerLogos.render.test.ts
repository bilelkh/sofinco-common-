/*
 * Contrat de rendu de `PartnerLogos`.
 *
 * Rendu SSR (`environment: node`) : c'est aussi la garantie que le composant est
 * consommable en Island Jahia, où GraalVM n'offre ni `document` ni `window`.
 *
 * Ce qui est vérifié ici échappe à tout test visuel :
 *
 *  - **le doublon du ruban**, condition de la boucle sans couture, et son retrait de
 *    l'arbre d'accessibilité — sans quoi un lecteur d'écran énumère deux fois les
 *    mêmes enseignes ;
 *  - **le logo décoratif par défaut**, qui ne transforme pas une bande d'illustration
 *    en litanie de « logo Machin » ;
 *  - **la durée proportionnelle au nombre de logos**, seule garante d'une vitesse
 *    constante d'une contribution à l'autre ;
 *  - **la section vide**, qui ne rend rien plutôt qu'un fond orphelin.
 *
 * Écrit en `.ts` et non `.tsx`, comme `SocialProof.render.test.ts`, d'où
 * `createElement` plutôt que du JSX.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import PartnerLogos from "./PartnerLogos";
import type { PartnerLogoItem, PartnerLogosProps } from "./PartnerLogos.type";

const logo = (id: string, extra: Partial<PartnerLogoItem> = {}): PartnerLogoItem => ({
	id,
	src: `/logos/${id}.svg`,
	...extra,
});

const render = (props: Partial<PartnerLogosProps> = {}) =>
	renderToStaticMarkup(
		createElement(PartnerLogos, {
			title: "Rejoignez les 15 000 entreprises partenaires",
			logos: [logo("printemps"), logo("fnac"), logo("castorama")],
			...props,
		}),
	);

describe("PartnerLogos", () => {
	it("duplique le ruban et masque le clone aux lecteurs d'écran", () => {
		const html = render();

		expect(html.match(/<ul/g)).toHaveLength(2);
		expect(html.match(/aria-hidden="true"[^>]*>\s*<li/g)).toHaveLength(1);
		expect(html.match(/src="\/logos\/fnac\.svg"/g)).toHaveLength(2);
	});

	it("ne rend qu'une liste quand le défilement est coupé", () => {
		const html = render({ animated: false });

		expect(html.match(/<ul/g)).toHaveLength(1);
		expect(html.match(/src="\/logos\/fnac\.svg"/g)).toHaveLength(1);
	});

	it("rend les logos décoratifs tant qu'aucun `alt` n'est fourni", () => {
		expect(render({ logos: [logo("fnac")] })).toContain('alt="" aria-hidden="true"');
	});

	it("annonce l'enseigne dès qu'un `alt` est fourni, mais jamais dans le clone", () => {
		const html = render({ logos: [logo("fnac", { alt: "Fnac" })] });

		expect(html.match(/alt="Fnac"/g)).toHaveLength(1);
		expect(html.match(/alt="" aria-hidden="true"/g)).toHaveLength(1);
	});

	it("cale la durée du défilement sur le nombre de logos", () => {
		expect(render({ logos: [logo("a"), logo("b")] })).toContain("--partner-logos-duration:8s");
		expect(render({ logos: [logo("a"), logo("b"), logo("c"), logo("d")] })).toContain(
			"--partner-logos-duration:16s",
		);
	});

	it("nomme la section par son titre, et par `ariaLabel` à défaut", () => {
		const titled = render();
		const labelledBy = titled.match(/aria-labelledby="([^"]+)"/)?.[1];

		expect(labelledBy).toBeDefined();
		expect(titled).toContain(`id="${labelledBy}"`);

		const untitled = render({ title: undefined, ariaLabel: "Nos partenaires" });
		expect(untitled).toContain('aria-label="Nos partenaires"');
		expect(untitled).not.toContain("aria-labelledby");
		expect(untitled).not.toContain("<h2");
	});

	it("transmet les dimensions intrinsèques pour réserver la place", () => {
		const html = render({ logos: [logo("printemps", { width: 216, height: 24 })] });

		expect(html).toContain('width="216"');
		expect(html).toContain('height="24"');
	});

	it("ne rend rien sans logo", () => {
		expect(render({ logos: [] })).toBe("");
	});
});
