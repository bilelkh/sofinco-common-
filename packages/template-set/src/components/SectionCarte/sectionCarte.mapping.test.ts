import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

// getRequiredCtaProps (sofmix:cta) : mock data-driven — contrat réel = retourne
// toujours un CtaProps ; href vide quand la cible ne résout pas.
vi.mock("#lib/cta", () => ({
	getRequiredCtaProps: vi.fn(
		(node: { __props?: Record<string, unknown> }, ctaSection: string, variant = "accent") => ({
			label: (node.__props?.ctaLabel as string) ?? "En savoir plus",
			href: node.__props?.ctaType ? "/cta-target" : "",
			target: "_self",
			ctaSection,
			variant,
		}),
	),
}));

import { mapSectionCarteProps } from "./sectionCarte.mapping";

describe("mapSectionCarteProps", () => {
	it("maps the full node: heading config, image, content, items and CTA", () => {
		const node = makeNode({
			nodeTypes: ["sofnt:sectionCarte"],
			props: {
				"jcr:title": "Avec la Carte Sofinco, je gagne en liberté de paiement",
				"subtitle": "Une carte de crédit associée à un crédit renouvelable.",
				"eyebrow": "Carte Sofinco",
				"titleLevel": "h2",
				"titleStyle": "h3",
				"image": "carte.png",
				"imageAlt": "Une personne tenant la Carte Sofinco",
				"contentTitle": "Demandez gratuitement votre Carte Sofinco",
				"contentText": "À chaque paiement par carte, vous choisissez comment rembourser.",
				"items": [
					"Je règle en magasin, en ligne",
					"Je choisis de payer au comptant différé",
					"Je retire mon argent au distributeur",
				],
				"ctaType": "internal",
				"ctaLabel": "En savoir plus sur la carte Sofinco",
			},
		});

		expect(mapSectionCarteProps(node)).toEqual({
			title: "Avec la Carte Sofinco, je gagne en liberté de paiement",
			subtitle: "Une carte de crédit associée à un crédit renouvelable.",
			eyebrow: "Carte Sofinco",
			titleAs: "h2",
			visualStyle: "h3",
			imageUrl: "carte.png",
			imageAlt: "Une personne tenant la Carte Sofinco",
			contentTitle: "Demandez gratuitement votre Carte Sofinco",
			contentText: "À chaque paiement par carte, vous choisissez comment rembourser.",
			items: [
				{ id: "0", label: "Je règle en magasin, en ligne" },
				{ id: "1", label: "Je choisis de payer au comptant différé" },
				{ id: "2", label: "Je retire mon argent au distributeur" },
			],
			ctaLabel: "En savoir plus sur la carte Sofinco",
			ctaUrl: "/cta-target",
		});
	});

	it("falls back on every optional field: undefined subtitle/eyebrow, h2 defaults, empty items", () => {
		const node = makeNode({
			nodeTypes: ["sofnt:sectionCarte"],
			props: {
				"jcr:title": "Titre seul",
				"image": "carte.png",
				"contentTitle": "Titre contenu",
				"contentText": "Texte contenu",
			},
		});

		expect(mapSectionCarteProps(node)).toEqual({
			title: "Titre seul",
			subtitle: undefined,
			eyebrow: undefined,
			titleAs: "h2",
			visualStyle: "h2",
			imageUrl: "carte.png",
			imageAlt: "",
			contentTitle: "Titre contenu",
			contentText: "Texte contenu",
			items: [],
			ctaLabel: "En savoir plus",
			ctaUrl: "",
		});
	});
});
