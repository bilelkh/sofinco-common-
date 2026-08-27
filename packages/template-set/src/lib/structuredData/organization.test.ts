import { describe, it, expect, vi } from "vitest";
import { makeNode, type PropValue } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("#lib/cacheDependency", () => ({
	addDirectChildrenCacheDependency: vi.fn(),
	addNodeCacheDependency: vi.fn(),
	addSubtreeCacheDependency: vi.fn(),
}));

import {
	buildOrganization,
	organizationId,
	organizationRef,
	readOrganizationSettings,
} from "./organization";

const ORIGIN = "https://www.sofinco.fr";

const settingsNode = (props: Record<string, PropValue> = {}) =>
	makeNode({ nodeTypes: ["sofnt:structuredDataSettings"], props });

const full = () =>
	readOrganizationSettings(
		settingsNode({
			legalName: "Sofinco",
			organizationUrl: "https://www.sofinco.fr",
			logo: makeNode({ url: "/files/logo.svg", props: { "j:width": 512, "j:height": 512 } }),
			description: "Prêts à la consommation",
			founder: "Crédit Agricole Consumer Finance",
			telephone: "+33-800-02-05-05",
			streetAddress: "1 Rue Victor Basch",
			postalCode: "91300",
			addressLocality: "Massy",
			addressCountry: "FR",
			sameAs: ["https://www.facebook.com/SofincoCredit", "  ", "https://fr.linkedin.com/x"],
		}),
		ORIGIN,
	);

describe("readOrganizationSettings", () => {
	it("lit et normalise le nœud de configuration", () => {
		expect(full()).toEqual({
			legalName: "Sofinco",
			url: "https://www.sofinco.fr",
			logo: { url: "https://www.sofinco.fr/files/logo.svg", width: 512, height: 512 },
			description: "Prêts à la consommation",
			founder: "Crédit Agricole Consumer Finance",
			telephone: "+33-800-02-05-05",
			contactType: "customer service",
			streetAddress: "1 Rue Victor Basch",
			postalCode: "91300",
			addressLocality: "Massy",
			addressCountry: "FR",
			sameAs: ["https://www.facebook.com/SofincoCredit", "https://fr.linkedin.com/x"],
			articleAuthorName: "La Rédaction Sofinco",
		});
	});

	it("retombe sur l'origine quand aucune URL d'organisation n'est saisie", () => {
		expect(readOrganizationSettings(settingsNode(), ORIGIN)?.url).toBe(ORIGIN);
	});

	it("respecte l'auteur saisi", () => {
		const settings = readOrganizationSettings(
			settingsNode({ articleAuthorName: "Les experts Sofinco" }),
			ORIGIN,
		);
		expect(settings?.articleAuthorName).toBe("Les experts Sofinco");
	});

	it("retourne null quand le nœud de configuration est absent", () => {
		expect(readOrganizationSettings(null, ORIGIN)).toBeNull();
	});
});

describe("buildOrganization", () => {
	it("construit l'entité complète et l'ancre sur un @id stable", () => {
		expect(buildOrganization(full(), { origin: ORIGIN })).toEqual({
			// Adresse renseignée → typage `FinancialService` (cf. plus bas).
			"@type": ["Organization", "FinancialService"],
			"@id": "https://www.sofinco.fr/#organization",
			"name": "Sofinco",
			"url": "https://www.sofinco.fr",
			"logo": {
				"@type": "ImageObject",
				"url": "https://www.sofinco.fr/files/logo.svg",
				"width": 512,
				"height": 512,
			},
			"description": "Prêts à la consommation",
			"founder": "Crédit Agricole Consumer Finance",
			"address": {
				"@type": "PostalAddress",
				"streetAddress": "1 Rue Victor Basch",
				"postalCode": "91300",
				"addressLocality": "Massy",
				"addressCountry": "FR",
			},
			"contactPoint": {
				"@type": "ContactPoint",
				"telephone": "+33-800-02-05-05",
				"contactType": "customer service",
			},
			"sameAs": ["https://www.facebook.com/SofincoCredit", "https://fr.linkedin.com/x"],
		});
	});

	it("n'émet jamais de note globale — un avis auto-attribué viole la policy Google", () => {
		expect(buildOrganization(full(), { origin: ORIGIN })).not.toHaveProperty("aggregateRating");
	});

	it("ne précise le type en FinancialService que si l'adresse est renseignée", () => {
		// `FinancialService` dérive de `LocalBusiness`, pour lequel Google attend
		// `name` ET `address` : sans adresse, le typage produirait un
		// « missing required field » au lieu d'un gain de précision.
		const settings = readOrganizationSettings(settingsNode({ legalName: "Sofinco" }), ORIGIN);
		expect(buildOrganization(settings, { origin: ORIGIN })?.["@type"]).toBe("Organization");
	});

	it("omet adresse et contact plutôt que de les émettre vides", () => {
		const settings = readOrganizationSettings(settingsNode({ legalName: "Sofinco" }), ORIGIN);
		const node = buildOrganization(settings, { origin: ORIGIN });
		expect(node?.address).toBeUndefined();
		expect(node?.contactPoint).toBeUndefined();
		expect(node?.sameAs).toBeUndefined();
		expect(node?.logo).toBeUndefined();
	});

	it("n'émet rien sans nom légal ni sans configuration", () => {
		expect(
			buildOrganization(readOrganizationSettings(settingsNode(), ORIGIN), { origin: ORIGIN }),
		).toBeNull();
		expect(buildOrganization(null, { origin: ORIGIN })).toBeNull();
	});
});

describe("organizationId / organizationRef", () => {
	it("fabrique une ancre et un renvoi cohérents", () => {
		expect(organizationId(ORIGIN)).toBe("https://www.sofinco.fr/#organization");
		expect(organizationRef(ORIGIN)).toEqual({ "@id": "https://www.sofinco.fr/#organization" });
	});
});
