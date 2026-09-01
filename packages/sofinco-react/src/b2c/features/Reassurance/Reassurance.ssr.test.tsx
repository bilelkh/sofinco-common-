import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import Reassurance from "./Reassurance";

/*
 * CONTRAT D'EN-TÊTE DE SECTION — ce que le passage aux props groupées avait cassé.
 *
 * `sectionHeadingProps` vient d'un mapper Jahia : il ne porte QUE des champs contribués
 * (titre, sous-titre, niveau, apparence). Trois props restent la propriété de la section
 * et ne doivent jamais dépendre du contenu :
 *
 *   - `id`         : cible de l'`aria-labelledby` du <section>. Perdu, la section est
 *                    annoncée sans libellé par un lecteur d'écran.
 *   - `align`      : décision de maquette. Perdu, l'en-tête repasse à gauche (défaut
 *                    `align="start"` de <SectionHeading>) — invisible en revue de diff.
 *   - `visualStyle`: la typo vient de `.reassurance__title`. Laissé au mapper, le titre
 *                    porte `.title--h2` et grimpe en --text-5xl au-dessus de 1024px.
 *
 * D'où l'ordre imposé dans le JSX : spread D'ABORD, props de la section ENSUITE.
 */

const items = [{ id: "i1", title: "Sans frais de dossier", titleAs: "h3" as const }];

const contributed = {
	title: "Nos engagements",
	subtitle: "Ce sur quoi vous pouvez compter",
	titleAs: "h2" as const,
	// Ce que le mapper émet réellement (`readTitleStyle`, défaut "h2").
	visualStyle: "h2" as const,
};

describe("Reassurance — l'en-tête garde ce qui appartient à la section", () => {
	it("centre l'en-tête, quoi qu'émette le mapper", () => {
		const html = renderToString(<Reassurance sectionHeadingProps={contributed} items={items} />);

		expect(html).toContain("heading--center");
		expect(html).not.toContain("heading--start");
	});

	it("laisse `aria-labelledby` pointer sur un id réellement émis", () => {
		const html = renderToString(<Reassurance sectionHeadingProps={contributed} items={items} />);

		const labelledBy = /aria-labelledby="([^"]+)"/.exec(html)?.[1];
		expect(labelledBy).toBeTruthy();
		// L'id doit exister DANS le document, pas seulement être référencé.
		expect(html).toContain(`id="${labelledBy}"`);
	});

	it("neutralise le `visualStyle` contribué — la typo est celle de la section", () => {
		const html = renderToString(<Reassurance sectionHeadingProps={contributed} items={items} />);

		expect(html).not.toMatch(/title--h[1-6]/);
		expect(html).toContain("reassurance__title");
	});

	it("omet l'en-tête entier quand le mapper ne renvoie rien", () => {
		const html = renderToString(<Reassurance sectionHeadingProps={undefined} items={items} />);

		expect(html).not.toContain("heading--center");
		expect(html).toContain("Sans frais de dossier");
	});
});
