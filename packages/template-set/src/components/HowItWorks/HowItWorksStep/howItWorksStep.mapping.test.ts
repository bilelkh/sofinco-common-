import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import { mapHowItWorksStep, extractSteps } from "./howItWorksStep.mapping";

describe("mapHowItWorksStep", () => {
	it("maps id, title, description, imageUrl and imageAlt", () => {
		const node = makeNode({
			id: "step-1",
			props: {
				"jcr:title": "Je simule et je souscris en ligne",
				"description":
					"Choisissez votre montant et votre durée, obtenez une réponse de principe immédiate.",
				"image": "phone-simulation.png",
				"imageAlt": "Écran de simulation de prêt",
			},
		});

		expect(mapHowItWorksStep(node)).toEqual({
			id: "step-1",
			title: "Je simule et je souscris en ligne",
			// Repli "p" : le rendu live n a jamais posé de TITRE sur une étape.
			titleAs: "p",
			description:
				"Choisissez votre montant et votre durée, obtenez une réponse de principe immédiate.",
			imageUrl: "phone-simulation.png",
			imageAlt: "Écran de simulation de prêt",
		});
	});

	it("falls back to empty strings when optional fields are missing", () => {
		const node = makeNode({
			id: "step-bare",
			props: { "jcr:title": "Étape minimale" },
		});

		expect(mapHowItWorksStep(node)).toEqual({
			id: "step-bare",
			title: "Étape minimale",
			titleAs: "p",
			description: "",
			imageUrl: "",
			imageAlt: "",
		});
	});

	it("uses node.getIdentifier() as the React key (not jcr:title)", () => {
		const node = makeNode({
			id: "uuid-abc-123",
			props: { "jcr:title": "Whatever" },
		});

		expect(mapHowItWorksStep(node).id).toBe("uuid-abc-123");
	});
});

describe("extractSteps", () => {
	it("returns steps in JCR child order (preserved by Jahia for orderable nodes)", () => {
		const s1 = makeNode({
			id: "1",
			nodeTypes: ["sofnt:howItWorksStep"],
			props: { "jcr:title": "Étape 1" },
		});
		const s2 = makeNode({
			id: "2",
			nodeTypes: ["sofnt:howItWorksStep"],
			props: { "jcr:title": "Étape 2" },
		});
		const s3 = makeNode({
			id: "3",
			nodeTypes: ["sofnt:howItWorksStep"],
			props: { "jcr:title": "Étape 3" },
		});
		const parent = makeNode({ children: [s1, s2, s3] });

		const result = extractSteps(parent);
		expect(result.map((s) => s.id)).toEqual(["1", "2", "3"]);
		expect(result.map((s) => s.title)).toEqual(["Étape 1", "Étape 2", "Étape 3"]);
	});

	it("numbers the badge from the step rank (1, 2, 3…)", () => {
		const steps = ["a", "b", "c", "d"].map((id) =>
			makeNode({
				id,
				nodeTypes: ["sofnt:howItWorksStep"],
				props: { "jcr:title": `Étape ${id}` },
			}),
		);
		const parent = makeNode({ children: steps });

		expect(extractSteps(parent).map((s) => s.badge)).toEqual([1, 2, 3, 4]);
	});

	it("assigns badge over the filtered order, not the raw child index", () => {
		const other = makeNode({ id: "x", nodeTypes: ["sofnt:somethingElse"] });
		const s1 = makeNode({
			id: "s1",
			nodeTypes: ["sofnt:howItWorksStep"],
			props: { "jcr:title": "Étape 1" },
		});
		const s2 = makeNode({
			id: "s2",
			nodeTypes: ["sofnt:howItWorksStep"],
			props: { "jcr:title": "Étape 2" },
		});
		// Un intrus intercalé ne doit pas décaler la numérotation.
		const parent = makeNode({ children: [other, s1, other, s2] });

		const result = extractSteps(parent);
		expect(result.map((s) => s.id)).toEqual(["s1", "s2"]);
		expect(result.map((s) => s.badge)).toEqual([1, 2]);
	});

	it("carries imageAlt through into each extracted step", () => {
		const s1 = makeNode({
			id: "s1",
			nodeTypes: ["sofnt:howItWorksStep"],
			props: { "jcr:title": "Étape 1", "image": "s1.png", "imageAlt": "Visuel étape 1" },
		});
		const parent = makeNode({ children: [s1] });

		expect(extractSteps(parent)[0]).toEqual({
			id: "s1",
			title: "Étape 1",
			titleAs: "p",
			description: "",
			imageUrl: "s1.png",
			imageAlt: "Visuel étape 1",
			badge: 1,
		});
	});

	it("filters out children that are not sofnt:howItWorksStep", () => {
		const step = makeNode({
			id: "step",
			nodeTypes: ["sofnt:howItWorksStep"],
			props: { "jcr:title": "Étape" },
		});
		const other = makeNode({
			id: "other",
			nodeTypes: ["sofnt:somethingElse"],
			props: { "jcr:title": "Autre" },
		});
		const parent = makeNode({ children: [other, step, other] });

		const result = extractSteps(parent);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("step");
	});

	it("returns an empty array when the parent has no children", () => {
		const parent = makeNode({ children: [] });
		expect(extractSteps(parent)).toEqual([]);
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
describe("mapHowItWorksStep — niveau herite du conteneur", () => {
	const conteneur = (props: Record<string, string> = {}) =>
		makeNode({ nodeTypes: ["sofnt:howItWorks"], props });

	it("applique le niveau choisi sur le bloc", () => {
		const node = makeNode({
			props: { "jcr:title": "T" },
			parent: conteneur({ itemsTitleLevel: "h3" }),
		});
		expect(mapHowItWorksStep(node).titleAs).toBe("h3");
	});

	it("retombe sur 'p' quand le bloc ne choisit rien", () => {
		const node = makeNode({ props: { "jcr:title": "T" }, parent: conteneur() });
		expect(mapHowItWorksStep(node).titleAs).toBe("p");
	});

	// Apercu d'edition d'un item isole : aucun conteneur atteignable, rendu d'origine.
	it("retombe sur 'p' sans conteneur atteignable", () => {
		expect(mapHowItWorksStep(makeNode({ props: { "jcr:title": "T" } })).titleAs).toBe("p");
	});

	// Reliquat possible d'un contenu migre : la propriete sur l'item ne doit rien faire.
	it("ignore un niveau residuel pose sur l'item", () => {
		const node = makeNode({
			props: { ...{ "jcr:title": "T" }, itemsTitleLevel: "h6" },
			parent: conteneur({ itemsTitleLevel: "h3" }),
		});
		expect(mapHowItWorksStep(node).titleAs).toBe("h3");
	});
});
