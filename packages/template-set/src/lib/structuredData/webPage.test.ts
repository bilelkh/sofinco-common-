import { describe, it, expect } from "vitest";

import { buildWebPage } from "./webPage";

const ORIGIN = "https://www.sofinco.fr";
const CANONICAL = `${ORIGIN}/credit-pret/pret-personnel`;

const INPUT = {
	canonical: CANONICAL,
	name: "Prêt personnel",
	description: "Financez tous vos projets.",
	inLanguage: "fr",
	isPartOf: { "@id": `${ORIGIN}/#website` },
	breadcrumb: { "@id": `${CANONICAL}#breadcrumb` },
};

describe("buildWebPage", () => {
	it("construit le pivot et le relie au site et au fil d'Ariane", () => {
		expect(buildWebPage(INPUT)).toEqual({
			"@type": "WebPage",
			// L'`@id` est le canonical lui-même, pas une ancre `#webpage` : c'est la
			// convention que suit `Article.mainEntityOfPage`.
			"@id": CANONICAL,
			"url": CANONICAL,
			"name": "Prêt personnel",
			"description": "Financez tous vos projets.",
			"inLanguage": "fr",
			"isPartOf": { "@id": `${ORIGIN}/#website` },
			"breadcrumb": { "@id": `${CANONICAL}#breadcrumb` },
		});
	});

	it("n'émet aucune date — celle du nœud de page ne décrit pas la fraîcheur du contenu", () => {
		// `jcr:lastModified` d'un `jnt:page` ne bouge pas quand un bloc est édité :
		// la publier annoncerait une fraîcheur que la page n'a pas.
		const node = buildWebPage(INPUT);
		expect(node).not.toHaveProperty("datePublished");
		expect(node).not.toHaveProperty("dateModified");
	});

	it("omet les renvois vers des nœuds absents du graphe", () => {
		const node = buildWebPage({ ...INPUT, isPartOf: undefined, breadcrumb: undefined });
		expect(node?.isPartOf).toBeUndefined();
		expect(node?.breadcrumb).toBeUndefined();
	});

	it("omet description et langue plutôt que de les émettre vides", () => {
		const node = buildWebPage({ ...INPUT, description: "", inLanguage: "" });
		expect(node?.description).toBeUndefined();
		expect(node?.inLanguage).toBeUndefined();
	});

	it("n'émet rien sans URL publique — les renvois qui le visent resteraient pendants", () => {
		expect(buildWebPage({ ...INPUT, canonical: "" })).toBeNull();
	});
});
