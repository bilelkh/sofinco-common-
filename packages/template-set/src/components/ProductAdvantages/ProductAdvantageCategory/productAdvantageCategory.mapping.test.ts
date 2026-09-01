import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import { mapProductAdvantageCategory } from "./productAdvantageCategory.mapping";

describe("mapProductAdvantageCategory", () => {
	it("maps a fully contributed category", () => {
		const node = makeNode({
			id: "cat-1",
			props: {
				"jcr:title": "Réserve d'argent",
				"heading": "Une réserve <strong>disponible</strong>",
				"text": "<p>Réutilisable au fur et à mesure.</p>",
				"imageDesktop": "/files/desktop.webp",
				"imageMobile": "/files/mobile.webp",
				"imageAlt": "Une cliente au quotidien",
			},
		});

		expect(mapProductAdvantageCategory(node)).toEqual({
			id: "cat-1",
			label: "Réserve d'argent",
			title: "Une réserve <strong>disponible</strong>",
			// Repli h3 : le niveau codé en dur dans le slide.
			titleAs: "h3",
			text: "<p>Réutilisable au fur et à mesure.</p>",
			imageDesktop: "/files/desktop.webp",
			imageMobile: "/files/mobile.webp",
			imageAlt: "Une cliente au quotidien",
		});
	});

	it("omits imageAlt when not contributed", () => {
		const node = makeNode({
			id: "cat-2",
			props: {
				"jcr:title": "Étalement",
				"heading": "Étalez après avoir payé",
				"text": "<p>3, 12 ou 60 mensualités.</p>",
				"imageDesktop": "/files/d.webp",
				"imageMobile": "/files/m.webp",
			},
		});

		expect(mapProductAdvantageCategory(node).imageAlt).toBeUndefined();
	});
});

/*
 * LE NIVEAU SE LIT SUR LE CONTENEUR, PAS SUR L'ITEM.
 *
 * Ces tests etaient le trou reel du lot : le fichier affichait 100% de couverture parce
 * qu'aucun cas ne construisait de parent — `findAncestor` renvoyait toujours `null` et
 * seul le repli etait exerce. Le contrat introduit par le deplacement n'etait donc pas
 * teste du tout.
 */
describe("mapProductAdvantageCategory — niveau herite du conteneur", () => {
	const conteneur = (props: Record<string, string> = {}) =>
		makeNode({ nodeTypes: ["sofnt:productAdvantages"], props });

	it("applique le niveau choisi sur le bloc", () => {
		const node = makeNode({
			props: { heading: "T" },
			parent: conteneur({ itemsTitleLevel: "h2" }),
		});
		expect(mapProductAdvantageCategory(node).titleAs).toBe("h2");
	});

	it("retombe sur 'h3' quand le bloc ne choisit rien", () => {
		const node = makeNode({ props: { heading: "T" }, parent: conteneur() });
		expect(mapProductAdvantageCategory(node).titleAs).toBe("h3");
	});

	// Apercu d'edition d'un item isole : aucun conteneur atteignable, rendu d'origine.
	it("retombe sur 'h3' sans conteneur atteignable", () => {
		expect(mapProductAdvantageCategory(makeNode({ props: { heading: "T" } })).titleAs).toBe("h3");
	});

	// Reliquat possible d'un contenu migre : la propriete sur l'item ne doit rien faire.
	it("ignore un niveau residuel pose sur l'item", () => {
		const node = makeNode({
			props: { ...{ heading: "T" }, itemsTitleLevel: "h6" },
			parent: conteneur({ itemsTitleLevel: "h2" }),
		});
		expect(mapProductAdvantageCategory(node).titleAs).toBe("h2");
	});
});
