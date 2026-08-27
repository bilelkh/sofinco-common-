import { describe, it, expect } from "vitest";

import { buildWebSite, webSiteId, webSiteRef } from "./webSite";

const ORIGIN = "https://www.sofinco.fr";
const PUBLISHER = { "@id": `${ORIGIN}/#organization` };

const INPUT = { origin: ORIGIN, name: "Sofinco", inLanguage: "fr", publisher: PUBLISHER };

describe("buildWebSite", () => {
	it("construit l'entité site et la rattache à la marque", () => {
		expect(buildWebSite(INPUT)).toEqual({
			"@type": "WebSite",
			"@id": `${ORIGIN}/#website`,
			"url": `${ORIGIN}/`,
			"name": "Sofinco",
			"inLanguage": "fr",
			"publisher": PUBLISHER,
		});
	});

	it("n'émet pas de potentialAction — la sitelinks searchbox n'existe plus", () => {
		// C'était la seule raison technique de déclarer un `WebSite` ; Google a retiré
		// ce résultat enrichi fin 2024 et n'interprète plus la propriété.
		expect(buildWebSite(INPUT)).not.toHaveProperty("potentialAction");
	});

	it("omet le renvoi vers la marque quand elle n'est pas dans le graphe", () => {
		// Même règle que `Article.publisher` : un `@id` sans cible dans le document
		// est un renvoi pendant, que Google fait remonter en erreur.
		expect(buildWebSite({ ...INPUT, publisher: undefined })?.publisher).toBeUndefined();
	});

	it("omet la langue plutôt que de l'émettre vide", () => {
		expect(buildWebSite({ ...INPUT, inLanguage: "" })?.inLanguage).toBeUndefined();
	});

	it("n'émet rien sans origine ni sans nom de site", () => {
		expect(buildWebSite({ ...INPUT, origin: "" })).toBeNull();
		expect(buildWebSite({ ...INPUT, name: "" })).toBeNull();
	});
});

describe("webSiteId / webSiteRef", () => {
	it("fabrique une ancre et un renvoi cohérents", () => {
		expect(webSiteId(ORIGIN)).toBe("https://www.sofinco.fr/#website");
		expect(webSiteRef(ORIGIN)).toEqual({ "@id": "https://www.sofinco.fr/#website" });
	});
});
