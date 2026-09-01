import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

// getCtaProps (sofmix:ctaOptional) : mock data-driven sur `ctaType` du node fixture.
// Reproduit le contrat réel — null quand le CTA est désactivé/absent, sinon un CtaProps.
vi.mock("#lib/cta", () => ({
	getCtaProps: vi.fn(
		(node: { __props?: Record<string, unknown> }, ctaSection: string, variant = "accent") => {
			const ctaType = node.__props?.ctaType;
			if (ctaType !== "internal" && ctaType !== "external") return null;
			return {
				label: (node.__props?.ctaLabel as string) ?? "En savoir plus",
				href: "/cta-target",
				target: (node.__props?.ctaTarget as string) ?? "_self",
				ctaSection,
				variant,
			};
		},
	),
}));

import { mapHowItWorksPropsClient, mapHowItWorksPropsServer } from "./howItWorks.mapping";

// `t` propagée à mapVideoBlockProps (label transcription i18n).
const t = (key: string): string =>
	key === "videoBlock.transcriptionLabel" ? "Retranscription vidéo" : key;

const baseProps = {
	"jcr:title": "Je découvre le prêt personnel dès maintenant",
	"subtitle": "Un projet financé en 3 clics, vous connaissez ?",
	"titleLevel": "h2",
	"titleStyle": "h2",
};

const makeStep = (id: string, title: string) =>
	makeNode({
		id,
		nodeTypes: ["sofnt:howItWorksStep"],
		props: {
			"jcr:title": title,
			"description": `${title} — description`,
			"image": `${id}.png`,
			"imageAlt": `Visuel ${title}`,
		},
	});

describe("mapHowItWorksPropsClient", () => {
	it("maps title (TitleProps), subtitle and embeds the ordered list of steps", () => {
		const s1 = makeStep("1", "Je simule et je souscris en ligne");
		const s2 = makeStep("2", "Je reçois les fonds sur mon compte");
		const s3 = makeStep("3", "Je rembourse à mensualités fixes");
		const s4 = makeStep("4", "Crédit remboursé : c'est terminé.");

		const node = makeNode({
			props: baseProps,
			nodeTypes: ["sofnt:howItWorks"],
			children: [s1, s2, s3, s4],
		});

		expect(mapHowItWorksPropsClient(node, t)).toEqual({
			title: {
				children: "Je découvre le prêt personnel dès maintenant",
				as: "h2",
				visualStyle: "h2",
			},
			subtitle: "Un projet financé en 3 clics, vous connaissez ?",
			steps: [
				{
					id: "1",
					badge: 1,
					title: "Je simule et je souscris en ligne",
					titleAs: "p",
					description: "Je simule et je souscris en ligne — description",
					imageUrl: "1.png",
					imageAlt: "Visuel Je simule et je souscris en ligne",
				},
				{
					id: "2",
					badge: 2,
					title: "Je reçois les fonds sur mon compte",
					titleAs: "p",
					description: "Je reçois les fonds sur mon compte — description",
					imageUrl: "2.png",
					imageAlt: "Visuel Je reçois les fonds sur mon compte",
				},
				{
					id: "3",
					badge: 3,
					title: "Je rembourse à mensualités fixes",
					titleAs: "p",
					description: "Je rembourse à mensualités fixes — description",
					imageUrl: "3.png",
					imageAlt: "Visuel Je rembourse à mensualités fixes",
				},
				{
					id: "4",
					badge: 4,
					title: "Crédit remboursé : c'est terminé.",
					titleAs: "p",
					description: "Crédit remboursé : c'est terminé. — description",
					imageUrl: "4.png",
					imageAlt: "Visuel Crédit remboursé : c'est terminé.",
				},
			],
			imagePosition: "left",
		});
	});

	it("returns an empty steps array when there is no child step", () => {
		const node = makeNode({ props: baseProps, nodeTypes: ["sofnt:howItWorks"], children: [] });
		const result = mapHowItWorksPropsClient(node, t);
		expect(result.steps).toEqual([]);
	});

	it("ignores children that are not sofnt:howItWorksStep", () => {
		const step = makeStep("ok", "Étape valide");
		const stranger = makeNode({
			id: "x",
			nodeTypes: ["sofnt:other"],
			props: { "jcr:title": "Intrus" },
		});
		const node = makeNode({
			props: baseProps,
			nodeTypes: ["sofnt:howItWorks"],
			children: [stranger, step],
		});

		const result = mapHowItWorksPropsClient(node, t);
		expect(result.steps).toHaveLength(1);
		expect(result.steps[0].id).toBe("ok");
	});

	it("returns title=undefined and subtitle=undefined when both are empty", () => {
		// buildTitleProps renvoie undefined si jcr:title est vide
		// → le composant React omet l'en-tête entier.
		const node = makeNode({ props: {}, nodeTypes: ["sofnt:howItWorks"], children: [] });
		const result = mapHowItWorksPropsClient(node, t);
		expect(result.title).toBeUndefined();
		expect(result.subtitle).toBeUndefined();
	});

	it("defaults title.as / title.visualStyle to 'h2' when heading mixin fields are missing", () => {
		const node = makeNode({
			props: { "jcr:title": "T" },
			nodeTypes: ["sofnt:howItWorks"],
			children: [],
		});
		const result = mapHowItWorksPropsClient(node, t);
		expect(result.title).toEqual({ children: "T", as: "h2", visualStyle: "h2" });
	});

	it("honors titleLevel and titleStyle when contributor sets them independently", () => {
		const node = makeNode({
			props: { "jcr:title": "T", "titleLevel": "h3", "titleStyle": "h2" },
			nodeTypes: ["sofnt:howItWorks"],
			children: [],
		});
		const result = mapHowItWorksPropsClient(node, t);
		// H3 sémantique avec apparence H2 — pattern SEO/visuel décorrélé.
		expect(result.title).toEqual({ children: "T", as: "h3", visualStyle: "h2" });
	});

	it("ignores invalid level values defensively (defaults to h2)", () => {
		const node = makeNode({
			props: { "jcr:title": "T", "titleLevel": "h7", "titleStyle": "wat" },
			nodeTypes: ["sofnt:howItWorks"],
			children: [],
		});
		const result = mapHowItWorksPropsClient(node, t);
		expect(result.title).toEqual({ children: "T", as: "h2", visualStyle: "h2" });
	});

	it("maps imagePosition and falls back to 'left' when unset or invalid", () => {
		// `autocreated` ne joue qu'à la création du nœud : les sofnt:howItWorks
		// antérieurs à la propriété n'en portent aucune valeur et empruntent le
		// repli jusqu'à leur prochain ré-enregistrement. Les valeurs hors
		// choicelist (import legacy, seed Groovy) sont ignorées défensivement —
		// même contrat que `titleLevel` ci-dessus.
		const at = (imagePosition?: string) =>
			makeNode({
				props: imagePosition === undefined ? {} : { imagePosition },
				nodeTypes: ["sofnt:howItWorks"],
				children: [],
			});

		expect(mapHowItWorksPropsClient(at("right"), t).imagePosition).toBe("right");
		expect(mapHowItWorksPropsClient(at("left"), t).imagePosition).toBe("left");
		expect(mapHowItWorksPropsClient(at(), t).imagePosition).toBe("left");
		expect(mapHowItWorksPropsClient(at(""), t).imagePosition).toBe("left");
		expect(mapHowItWorksPropsClient(at("center"), t).imagePosition).toBe("left");
	});

	it("maps cta from the sofmix:ctaOptional mixin when a link is configured", () => {
		const node = makeNode({
			props: {
				...baseProps,
				ctaType: "internal",
				ctaLabel: "Je découvre l'offre",
			},
			nodeTypes: ["sofnt:howItWorks"],
			children: [],
		});
		expect(mapHowItWorksPropsClient(node, t).cta).toEqual({
			label: "Je découvre l'offre",
			href: "/cta-target",
			target: "_self",
			ctaSection: "how-it-works-cta",
			variant: "primary",
		});
	});

	it("returns cta=undefined when the mixin resolves no link (ctaType 'none')", () => {
		// baseProps ne définit pas ctaType → le mock renvoie null → cta omis.
		const node = makeNode({ props: baseProps, nodeTypes: ["sofnt:howItWorks"], children: [] });
		expect(mapHowItWorksPropsClient(node, t).cta).toBeUndefined();
	});

	it("returns video=undefined when the named 'video' child is absent", () => {
		const step = makeStep("1", "Étape");
		const node = makeNode({
			props: baseProps,
			nodeTypes: ["sofnt:howItWorks"],
			children: [step],
			// pas de named.video
		});
		expect(mapHowItWorksPropsClient(node, t).video).toBeUndefined();
	});

	it("embeds the named 'video' child as video — keeps `title`, strips only `subtitle`", () => {
		const step = makeStep("1", "Étape");
		const videoNode = makeNode({
			id: "v1",
			nodeTypes: ["sofnt:videoBlock"],
			props: {
				"jcr:title": "Titre propre à la vidéo (conservé)",
				"subtitle": "Sous-titre videoBlock IGNORÉ dans HowItWorks",
				"titleLevel": "h3",
				"titleStyle": "h3",
				"videoUrl": "https://www.youtube.com/watch?v=abc123",
				"videoTitle": "C'est quoi un prêt perso ?",
				"transcription": "<p>Bonjour…</p>",
			},
		});
		const node = makeNode({
			props: baseProps,
			nodeTypes: ["sofnt:howItWorks"],
			children: [step],
			named: { video: videoNode },
		});

		const result = mapHowItWorksPropsClient(node, t);
		expect(result.video).toBeDefined();
		// `title` du VideoBlock est CONSERVÉ (peut coexister avec le titre de section HowItWorks)
		expect(result.video?.title).toEqual({
			children: "Titre propre à la vidéo (conservé)",
			as: "h3",
			visualStyle: "h3",
		});
		// `subtitle` du VideoBlock est retiré (le HowItWorks fournit déjà son sous-titre)
		expect(result.video).not.toHaveProperty("subtitle");
		expect(result.video?.video).toEqual({
			url: "https://www.youtube.com/embed/abc123",
			title: "C'est quoi un prêt perso ?",
		});
		expect(result.video?.transcription).toEqual({
			title: "Retranscription vidéo",
			content: "<p>Bonjour…</p>",
		});
	});

	it("returns video=undefined if the named 'video' child is of the wrong type", () => {
		const stranger = makeNode({
			id: "x",
			nodeTypes: ["sofnt:other"],
			props: { "jcr:title": "Pas un videoBlock" },
		});
		const node = makeNode({
			props: baseProps,
			nodeTypes: ["sofnt:howItWorks"],
			children: [],
			named: { video: stranger },
		});
		expect(mapHowItWorksPropsClient(node, t).video).toBeUndefined();
	});
});

describe("mapHowItWorksPropsServer", () => {
	it("maps only title (TitleProps) and subtitle — steps/video delegated to <RenderChildren>", () => {
		const s1 = makeStep("1", "Étape 1");
		const s2 = makeStep("2", "Étape 2");
		const node = makeNode({
			props: baseProps,
			nodeTypes: ["sofnt:howItWorks"],
			children: [s1, s2],
		});

		const result = mapHowItWorksPropsServer(node);

		expect(result).toEqual({
			title: {
				children: "Je découvre le prêt personnel dès maintenant",
				as: "h2",
				visualStyle: "h2",
			},
			subtitle: "Un projet financé en 3 clics, vous connaissez ?",
			imagePosition: "left",
		});
		expect(result).not.toHaveProperty("steps");
		expect(result).not.toHaveProperty("video");
	});

	it("returns title=undefined and subtitle=undefined when fields are missing", () => {
		const node = makeNode({ props: {}, nodeTypes: ["sofnt:howItWorks"], children: [] });
		expect(mapHowItWorksPropsServer(node)).toEqual({
			title: undefined,
			subtitle: undefined,
			cta: undefined,
			imagePosition: "left",
		});
	});

	it("maps imagePosition so the edit view mirrors the live layout", () => {
		// HowItWorksServer applique .stepsImageRight à partir de ce champ —
		// l'aperçu d'édition doit suivre le même repli que le rendu live.
		const at = (imagePosition?: string) =>
			makeNode({
				props: imagePosition === undefined ? baseProps : { ...baseProps, imagePosition },
				nodeTypes: ["sofnt:howItWorks"],
				children: [],
			});

		expect(mapHowItWorksPropsServer(at("right")).imagePosition).toBe("right");
		expect(mapHowItWorksPropsServer(at()).imagePosition).toBe("left");
		expect(mapHowItWorksPropsServer(at("center")).imagePosition).toBe("left");
	});

	it("maps cta (sofmix:ctaOptional) so the edit view can preview it", () => {
		const node = makeNode({
			props: { ...baseProps, ctaType: "external", ctaLabel: "Vers le simulateur" },
			nodeTypes: ["sofnt:howItWorks"],
			children: [],
		});
		expect(mapHowItWorksPropsServer(node).cta).toEqual({
			label: "Vers le simulateur",
			href: "/cta-target",
			target: "_self",
			ctaSection: "how-it-works-cta",
			variant: "primary",
		});
	});
});
