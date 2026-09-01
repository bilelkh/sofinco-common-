import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";
import { mapAppShowcaseFeatureProps } from "./appShowcaseFeature.mapping";

vi.mock("#lib/jcr", () => import("#test/jahia"));

describe("mapAppShowcaseFeatureProps", () => {
	it("maps icon, title and description", () => {
		const node = makeNode({
			props: { "icon": "feat.svg", "jcr:title": "Titre", "description": "Texte" },
		});
		expect(mapAppShowcaseFeatureProps(node)).toEqual({
			iconUrl: "feat.svg",
			featureTitle: "Titre",
			// `titleLevel` non contribué → repli h3, le niveau codé en dur dans la carte.
			featureTitleAs: "h3",
			featureText: "Texte",
		});
	});

	it("falls back to empty strings when properties are missing", () => {
		expect(mapAppShowcaseFeatureProps(makeNode())).toEqual({
			iconUrl: "",
			featureTitle: "",
			featureTitleAs: "h3",
			featureText: "",
		});
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
describe("mapAppShowcaseFeatureProps — niveau herite du conteneur", () => {
	const conteneur = (props: Record<string, string> = {}) =>
		makeNode({ nodeTypes: ["sofnt:appShowcase"], props });

	it("applique le niveau choisi sur le bloc", () => {
		const node = makeNode({
			props: { "jcr:title": "T" },
			parent: conteneur({ itemsTitleLevel: "h4" }),
		});
		expect(mapAppShowcaseFeatureProps(node).featureTitleAs).toBe("h4");
	});

	it("retombe sur 'h3' quand le bloc ne choisit rien", () => {
		const node = makeNode({ props: { "jcr:title": "T" }, parent: conteneur() });
		expect(mapAppShowcaseFeatureProps(node).featureTitleAs).toBe("h3");
	});

	// Apercu d'edition d'un item isole : aucun conteneur atteignable, rendu d'origine.
	it("retombe sur 'h3' sans conteneur atteignable", () => {
		expect(
			mapAppShowcaseFeatureProps(makeNode({ props: { "jcr:title": "T" } })).featureTitleAs,
		).toBe("h3");
	});

	// Reliquat possible d'un contenu migre : la propriete sur l'item ne doit rien faire.
	it("ignore un niveau residuel pose sur l'item", () => {
		const node = makeNode({
			props: { ...{ "jcr:title": "T" }, itemsTitleLevel: "h6" },
			parent: conteneur({ itemsTitleLevel: "h4" }),
		});
		expect(mapAppShowcaseFeatureProps(node).featureTitleAs).toBe("h4");
	});
});
