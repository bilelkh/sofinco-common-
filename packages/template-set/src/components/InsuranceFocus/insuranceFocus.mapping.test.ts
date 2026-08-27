import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

// getRequiredCtaProps — mock data-driven. Contrat réel = retourne toujours un
// CtaProps ; href = "" quand la cible ne résout pas.
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

import {
	mapInsuranceFocusProps,
	mapInsuranceFocusServerProps,
} from "./insuranceFocus.mapping";

const buildNode = (props: Record<string, string> = {}) =>
	makeNode({
		nodeTypes: ["sofnt:insuranceFocus"],
		props: {
			"jcr:title": "Je protège mes projets en toutes circonstances",
			description:
				"En cas d'accident de la vie, soyez rassuré : votre assurance Sofinco prend le relais.",
			image: "/lifebuoy.webp",
			imageAlt: "",
			titleLevel: "h2",
			titleStyle: "h2",
			ctaType: "internal",
			ctaLabel: "Je découvre l'assurance",
			...props,
		},
	});

describe("mapInsuranceFocusProps → InsuranceFocusProps", () => {
	it("produit la forme complète (title, description, image, cta)", () => {
		const result = mapInsuranceFocusProps(buildNode());

		expect(result.title).toEqual({
			children: "Je protège mes projets en toutes circonstances",
			as: "h2",
			visualStyle: "h2",
		});
		expect(result.description).toBe(
			"En cas d'accident de la vie, soyez rassuré : votre assurance Sofinco prend le relais.",
		);
		expect(result.imageSrc).toBe("/lifebuoy.webp");
		expect(result.imageAlt).toBe("");
		expect(result.cta).toEqual({
			label: "Je découvre l'assurance",
			href: "/cta-target",
			target: "_self",
			ctaSection: "insurance-focus",
			variant: "accent",
		});
	});

	it("`title` fallback à TitleProps avec children vide quand jcr:title est vide", () => {
		// Le DS type impose `title: TitleProps` (required). Le mapper produit un
		// fallback safe pour éviter une violation de contrat, même sur un node
		// legacy où jcr:title serait absent malgré le form mandatory.
		const result = mapInsuranceFocusProps(buildNode({ "jcr:title": "" }));
		expect(result.title).toEqual({
			children: "",
			as: "h2",
			visualStyle: "h2",
		});
	});

	it("`title.as` et `title.visualStyle` reflètent sofmix:headingStyle", () => {
		const result = mapInsuranceFocusProps(
			buildNode({ titleLevel: "h1", titleStyle: "h3" }),
		);
		expect(result.title).toEqual({
			children: "Je protège mes projets en toutes circonstances",
			as: "h1",
			visualStyle: "h3",
		});
	});

	it("`title` fallback h2 quand titleLevel/titleStyle absents (nodes legacy)", () => {
		const node = makeNode({
			nodeTypes: ["sofnt:insuranceFocus"],
			props: {
				"jcr:title": "Titre",
				description: "d",
				image: "/i.webp",
				ctaType: "internal",
			},
		});
		const result = mapInsuranceFocusProps(node);
		expect(result.title.as).toBe("h2");
		expect(result.title.visualStyle).toBe("h2");
	});

	it("`imageAlt` vide quand non contribué (image décorative par défaut)", () => {
		const result = mapInsuranceFocusProps(buildNode({ imageAlt: "" }));
		expect(result.imageAlt).toBe("");
	});

	it("`imageAlt` remonté tel quel quand contribué (image informative)", () => {
		const result = mapInsuranceFocusProps(
			buildNode({ imageAlt: "Une bouée de sauvetage sur un pont de bateau" }),
		);
		expect(result.imageAlt).toBe("Une bouée de sauvetage sur un pont de bateau");
	});

	it("`imageSrc` vide quand image dépubliée/supprimée (état dégradé)", () => {
		const result = mapInsuranceFocusProps(buildNode({ image: "" }));
		expect(result.imageSrc).toBe("");
	});

	// ── CTA fallback ──────────────────────────────────────────────────────────

	it("`cta.label` fallback quand ctaLabel JCR absent (mock renvoie 'En savoir plus')", () => {
		const node = makeNode({
			nodeTypes: ["sofnt:insuranceFocus"],
			props: {
				"jcr:title": "T",
				description: "d",
				image: "/i.webp",
				ctaType: "internal",
			},
		});
		const result = mapInsuranceFocusProps(node);
		expect(result.cta.label).toBe("En savoir plus");
	});

	it("`cta.href` = '' quand la cible ne résout pas (item en cours d'édition)", () => {
		const node = makeNode({
			nodeTypes: ["sofnt:insuranceFocus"],
			props: {
				"jcr:title": "T",
				description: "d",
				image: "/i.webp",
				ctaLabel: "L",
				// pas de ctaType → mock renvoie href = ""
			},
		});
		const result = mapInsuranceFocusProps(node);
		expect(result.cta.href).toBe("");
	});

	it("`cta.tracking` non alimenté par le mapping (pas de champ JCR dédié)", () => {
		// Placeholder : verrouille l'absence de tracking dans la CND actuelle.
		// Si un jour un champ contribuable est ajouté, ce test doit être mis
		// à jour pour asserter le mapping du payload.
		const result = mapInsuranceFocusProps(buildNode());
		expect(result.cta.tracking).toBeUndefined();
	});
});

describe("mapInsuranceFocusServerProps (edit-mode preview mapper)", () => {
	// Signature : `(dsProps)` — le mapper consomme uniquement les dsProps
	// déjà résolus, aucun accès JCR direct. Les tests fabriquent des
	// InsuranceFocusProps minimalistes, cible unique = les champs lus.
	type InsuranceFocusPropsShape = Parameters<typeof mapInsuranceFocusServerProps>[0];
	const buildDsProps = (
		overrides: Partial<InsuranceFocusPropsShape> = {},
	): InsuranceFocusPropsShape => ({
		title: { children: "Titre", as: "h2", visualStyle: "h2" },
		description: "Description",
		imageSrc: "/i.webp",
		imageAlt: "",
		cta: {
			label: "Je découvre",
			href: "/cta-target",
			target: "_self",
			ctaSection: "insurance-focus",
			variant: "accent",
		},
		...overrides,
	});

	it("ne signale rien quand tous les champs sont remplis", () => {
		expect(mapInsuranceFocusServerProps(buildDsProps())).toEqual({
			missingTitle: false,
			missingDescription: false,
			missingImage: false,
			missingCta: false,
		});
	});

	it("`missingTitle` true quand dsProps.title.children est vide", () => {
		const result = mapInsuranceFocusServerProps(
			buildDsProps({ title: { children: "", as: "h2", visualStyle: "h2" } }),
		);
		expect(result.missingTitle).toBe(true);
	});

	it("`missingDescription` true quand dsProps.description est vide", () => {
		expect(mapInsuranceFocusServerProps(buildDsProps({ description: "" })).missingDescription).toBe(
			true,
		);
	});

	it("`missingImage` true quand dsProps.imageSrc est vide", () => {
		expect(mapInsuranceFocusServerProps(buildDsProps({ imageSrc: "" })).missingImage).toBe(true);
	});

	it("`missingCta` true quand dsProps.cta.href est vide (target non résolue)", () => {
		const result = mapInsuranceFocusServerProps(
			buildDsProps({
				cta: {
					label: "Je découvre",
					href: "",
					target: "_self",
					ctaSection: "insurance-focus",
					variant: "accent",
				},
			}),
		);
		expect(result.missingCta).toBe(true);
	});

	it("`missingCta` false même si le label est le fallback (trade-off documenté)", () => {
		// Trade-off assumé : le mapper server ne détecte pas le fallback
		// 'En savoir plus'. Le contributeur voit ce libellé dans le preview
		// WYSIWYG — pas besoin de bannière séparée.
		const result = mapInsuranceFocusServerProps(
			buildDsProps({
				cta: {
					label: "En savoir plus",
					href: "/cta-target",
					target: "_self",
					ctaSection: "insurance-focus",
					variant: "accent",
				},
			}),
		);
		expect(result.missingCta).toBe(false);
	});

	it("signale les 4 champs simultanément quand tout est vide", () => {
		const result = mapInsuranceFocusServerProps(
			buildDsProps({
				title: { children: "", as: "h2", visualStyle: "h2" },
				description: "",
				imageSrc: "",
				cta: {
					label: "En savoir plus",
					href: "",
					target: "_self",
					ctaSection: "insurance-focus",
					variant: "accent",
				},
			}),
		);
		expect(result).toEqual({
			missingTitle: true,
			missingDescription: true,
			missingImage: true,
			missingCta: true,
		});
	});
});
