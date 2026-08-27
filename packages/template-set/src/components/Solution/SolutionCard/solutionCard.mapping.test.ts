import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";
import type { JCRNodeWrapper } from "org.jahia.services.content";

// Helpers jcr data-driven (str/strList/getPropertyAsNode lisent le bag makeNode)
// et buildNodeUrl qui renvoie simplement l'URL du noeud. Le test reste ainsi
// centre sur la logique de mapping elle-meme.
vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("@jahia/javascript-modules-library", () => ({
	buildNodeUrl: vi.fn((node: { getUrl(): string }) => node.getUrl()),
}));

import {
	readSolutionCard,
	toSolutionSliderCardProps,
	toSolutionItem,
	toSolutionComplementaryCardData,
} from "./solutionCard.mapping";

/**
 * `makeNode` n'implemente pas `getDisplayableName` — le mapper l'utilise pour
 * derive `imageAlt`. On le greffe sur le noeud image des tests concernes.
 */
const withDisplayName = (node: JCRNodeWrapper, name: string): JCRNodeWrapper =>
	Object.assign(node, { getDisplayableName: () => name });

const imageNode = (url = "/img/desktop.webp", displayName = "Visuel pret perso") =>
	withDisplayName(makeNode({ id: "img", url }), displayName);

/** Carte complete : tous les champs renseignes, CTA via j:linknode. */
const fullCard = () =>
	makeNode({
		id: "card-1",
		nodeTypes: ["sofnt:solutionCard"],
		props: {
			"title": "Prêt personnel",
			"subtitle": "Empruntez avec Sofinco",
			"features": ["Jusqu'à 80K€", "Taux compétitifs", "Remboursements flexibles"],
			"ctaLabel": "Découvrir le prêt personnel",
			"image": imageNode(),
			"imageMobile": makeNode({ id: "img-m", url: "/img/mobile.webp" }),
			"j:linknode": makeNode({ id: "target", url: "/pret-personnel" }),
			"j:target": "_blank",
		},
	});

describe("readSolutionCard", () => {
	it("lit exhaustivement un noeud complet", () => {
		expect(readSolutionCard(fullCard())).toEqual({
			id: "card-1",
			title: "Prêt personnel",
			subtitle: "Empruntez avec Sofinco",
			features: ["Jusqu'à 80K€", "Taux compétitifs", "Remboursements flexibles"],
			ctaLabel: "Découvrir le prêt personnel",
			ctaUrl: "/pret-personnel",
			ctaTarget: "_blank",
			imageUrl: "/img/desktop.webp",
			imageUrlMobile: "/img/mobile.webp",
			imageAlt: "Visuel pret perso",
		});
	});

	it("applique les valeurs par defaut sur un noeud vide", () => {
		// Les champs sont mandatory au CND mais peuvent etre vides pendant la
		// contribution : le mapper ne doit jamais produire d'undefined inattendu.
		expect(readSolutionCard(makeNode({ id: "empty" }))).toEqual({
			id: "empty",
			title: "",
			subtitle: "",
			features: [],
			ctaLabel: "",
			ctaUrl: "#",
			ctaTarget: "_self",
			imageUrl: "",
			imageUrlMobile: undefined,
			imageAlt: "",
		});
	});

	describe("resolution de l'URL du CTA", () => {
		it("privilegie j:linknode sur j:url", () => {
			const card = makeNode({
				props: {
					"j:linknode": makeNode({ url: "/interne" }),
					"j:url": "https://externe.example",
				},
			});
			expect(readSolutionCard(card).ctaUrl).toBe("/interne");
		});

		it("retombe sur j:url quand aucun noeud n'est lie", () => {
			const card = makeNode({ props: { "j:url": "https://externe.example" } });
			expect(readSolutionCard(card).ctaUrl).toBe("https://externe.example");
		});

		it('retombe sur "#" quand ni lien interne ni URL — evite un <a href=""> qui rechargerait la page', () => {
			expect(readSolutionCard(makeNode()).ctaUrl).toBe("#");
		});
	});

	describe("images", () => {
		it("laisse imageUrlMobile undefined quand le champ optionnel est absent", () => {
			const card = makeNode({ props: { image: imageNode() } });
			const raw = readSolutionCard(card);
			expect(raw.imageUrl).toBe("/img/desktop.webp");
			expect(raw.imageUrlMobile).toBeUndefined();
		});

		it("derive imageAlt du nom affichable du noeud image", () => {
			const card = makeNode({ props: { image: imageNode("/x.webp", "Cuisine equipee") } });
			expect(readSolutionCard(card).imageAlt).toBe("Cuisine equipee");
		});
	});

	it("lit ctaTarget avec _self par defaut", () => {
		expect(readSolutionCard(makeNode()).ctaTarget).toBe("_self");
		expect(readSolutionCard(makeNode({ props: { "j:target": "_blank" } })).ctaTarget).toBe(
			"_blank",
		);
	});
});

describe("toSolutionSliderCardProps — contrat DS <SolutionCard>", () => {
	it("mappe vers les props du DS, avec le CTA imbrique", () => {
		expect(toSolutionSliderCardProps(fullCard())).toEqual({
			image: "/img/desktop.webp",
			imageMobile: "/img/mobile.webp",
			title: "Prêt personnel",
			description: "Empruntez avec Sofinco",
			features: ["Jusqu'à 80K€", "Taux compétitifs", "Remboursements flexibles"],
			cta: {
				label: "Découvrir le prêt personnel",
				href: "/pret-personnel",
				target: "_blank",
			},
		});
	});

	it("laisse imageMobile undefined quand le champ optionnel est absent", () => {
		expect(toSolutionSliderCardProps(makeNode()).imageMobile).toBeUndefined();
	});

	it("n'expose pas id — absent du contrat DS", () => {
		expect("id" in toSolutionSliderCardProps(fullCard())).toBe(false);
	});
});

describe("toSolutionItem — contrat DS <SolutionSlider>", () => {
	it("mappe vers SolutionItem avec un CTA a plat", () => {
		expect(toSolutionItem(fullCard())).toEqual({
			id: "card-1",
			title: "Prêt personnel",
			description: "Empruntez avec Sofinco",
			features: ["Jusqu'à 80K€", "Taux compétitifs", "Remboursements flexibles"],
			ctaLabel: "Découvrir le prêt personnel",
			href: "/pret-personnel",
			target: "_blank",
			image: "/img/desktop.webp",
			imageMobile: "/img/mobile.webp",
		});
	});

	it("laisse imageMobile undefined quand le champ optionnel est absent", () => {
		expect(toSolutionItem(makeNode()).imageMobile).toBeUndefined();
	});
});

describe("toSolutionComplementaryCardData — contrat DS <SolutionComplementary>", () => {
	it("mappe vers SolutionCardData en conservant imageMobile et imageAlt", () => {
		expect(toSolutionComplementaryCardData(fullCard())).toEqual({
			title: "Prêt personnel",
			subtitle: "Empruntez avec Sofinco",
			features: ["Jusqu'à 80K€", "Taux compétitifs", "Remboursements flexibles"],
			ctaLabel: "Découvrir le prêt personnel",
			ctaUrl: "/pret-personnel",
			ctaTarget: "_blank",
			imageUrl: "/img/desktop.webp",
			imageUrlMobile: "/img/mobile.webp",
			imageAlt: "Visuel pret perso",
		});
	});

	it("n'expose pas id — absent du contrat DS", () => {
		expect("id" in toSolutionComplementaryCardData(fullCard())).toBe(false);
	});
});

describe("coherence des trois derives", () => {
	// Garde-fou : les trois mappers derivent du meme socle `readSolutionCard`.
	// Si l'un d'eux cesse de lire la source commune, ces assertions echouent.
	it("exposent tous le meme titre, les memes features et la meme URL de CTA", () => {
		const card = fullCard();
		const raw = readSolutionCard(card);
		const slider = toSolutionSliderCardProps(card);
		const item = toSolutionItem(card);
		const complementary = toSolutionComplementaryCardData(card);

		expect([slider.title, item.title, complementary.title]).toEqual([
			raw.title,
			raw.title,
			raw.title,
		]);
		expect([slider.features, item.features, complementary.features]).toEqual([
			raw.features,
			raw.features,
			raw.features,
		]);
		expect([slider.cta.href, item.href, complementary.ctaUrl]).toEqual([
			raw.ctaUrl,
			raw.ctaUrl,
			raw.ctaUrl,
		]);
	});

	// Le champ `imageMobile` du CND etait auparavant lu par `readSolutionCard`
	// puis abandonne par les deux derives slider : le contributeur remplissait
	// "Image de fond (Mobile)" sans effet. Les trois contrats l'exposent
	// desormais, au meme breakpoint (600px) cote DS.
	it("propagent tous les trois le crop mobile", () => {
		const card = fullCard();
		const raw = readSolutionCard(card);
		expect([
			toSolutionSliderCardProps(card).imageMobile,
			toSolutionItem(card).imageMobile,
			toSolutionComplementaryCardData(card).imageUrlMobile,
		]).toEqual([raw.imageUrlMobile, raw.imageUrlMobile, raw.imageUrlMobile]);
	});

	it('propagent le fallback CTA "#" sur une carte vide', () => {
		const empty = makeNode({ id: "empty" });
		expect(toSolutionSliderCardProps(empty).cta.href).toBe("#");
		expect(toSolutionItem(empty).href).toBe("#");
		expect(toSolutionComplementaryCardData(empty).ctaUrl).toBe("#");
	});
});
