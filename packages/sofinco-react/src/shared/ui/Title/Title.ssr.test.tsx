import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import Title from "./Title";

/*
 * `resolveVisualClass` — les trois replis ouverts par l'élargissement de `TitleTag`.
 *
 * Ce lot a découplé la BALISE (`as`) de l'APPARENCE (`visualStyle`) et ouvert `as` à
 * h5/h6/p/span/div. L'ancien calcul était `visualStyle ?? Component` : dès que la balise
 * n'avait pas de classe homonyme dans `Title.module.css`, `styles["title--h5"]` valait
 * `undefined` et le titre sortait SANS AUCUNE typographie — silencieusement, sans erreur.
 *
 * Le cas était impossible tant que `as` s'arrêtait à h4. Il ne l'est plus, d'où ces tests.
 *
 * Les classes ne sont pas hachées ici : Vitest n'exécute pas PostCSS (`test.css` par défaut
 * à `false`) et renvoie un proxy de modules CSS qui rend la clé telle quelle. On assert donc
 * sur `title--h4` et non sur `_title--h4_1y6hh_79`.
 */

describe("Title — apparence résolue depuis la balise", () => {
	it("h5 retombe sur l'échelle h4, la plus petite que le DS expose", () => {
		const html = renderToString(<Title as="h5">Niveau profond</Title>);

		expect(html).toContain("<h5");
		// L'INTENTION est un titre : on rend la plus petite échelle plutôt que rien.
		expect(html).toContain("title--h4");
	});

	it("h6 suit le même repli que h5", () => {
		const html = renderToString(<Title as="h6">Niveau profond</Title>);

		expect(html).toContain("<h6");
		expect(html).toContain("title--h4");
	});

	it("p ne reçoit aucune typographie de titre", () => {
		const html = renderToString(<Title as="p">Ressemble à un titre, n'en est pas un</Title>);

		expect(html).toContain("<p");
		// C'est exactement ce que faisait le legacy quand le niveau était vide.
		expect(html).not.toMatch(/title--h[1-6]/);
	});

	it("span et div non plus", () => {
		expect(renderToString(<Title as="span">Dans un bouton</Title>)).not.toMatch(/title--h[1-6]/);
		expect(renderToString(<Title as="div">Dans un summary</Title>)).not.toMatch(/title--h[1-6]/);
	});

	it("`visualStyle` explicite l'emporte sur la balise — c'est tout l'objet du découplage", () => {
		const html = renderToString(
			<Title as="h4" visualStyle="h1">
				Balise h4, apparence h1
			</Title>,
		);

		expect(html).toContain("<h4");
		expect(html).toContain("title--h1");
		expect(html).not.toContain("title--h4");
	});

	it("`visualStyle` rattrape une balise non titrante", () => {
		const html = renderToString(
			<Title as="span" visualStyle="h3">
				Apparence demandée explicitement
			</Title>,
		);

		expect(html).toContain("title--h3");
	});

	it('`visualStyle="none"` neutralise toute échelle, même sur une balise stylée', () => {
		const html = renderToString(
			<Title as="h1" visualStyle="none">
				Typographie sur mesure
			</Title>,
		);

		expect(html).toContain("<h1");
		expect(html).not.toMatch(/title--h[1-6]/);
	});

	it("sans `visualStyle`, une balise h1–h4 garde son échelle homonyme", () => {
		expect(renderToString(<Title as="h1">T</Title>)).toContain("title--h1");
		expect(renderToString(<Title as="h3">T</Title>)).toContain("title--h3");
	});
});
