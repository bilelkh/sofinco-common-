import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
/*
 * Seules les PROPS sont doublées. Le mode, lui, vient de la vraie `resolveCtaMode` :
 * c'est elle qui décide du marquage vérifié plus bas, et la doubler reviendrait à
 * tester le double. Elle lit les mixins et propriétés que `makeNode` porte déjà.
 */
vi.mock("#lib/cta", async (importOriginal) => {
	const actual = await importOriginal<typeof import("#lib/cta")>();
	return {
		...actual,
		getCtaPropsWithMode: vi.fn((node: Parameters<typeof actual.resolveCtaMode>[0]) => ({
			props: {
				label: "Lien",
				href: "/l",
				target: "_self",
				ctaSection: "footer-link",
				variant: "accent",
			},
			mode: actual.resolveCtaMode(node),
		})),
	};
});

import { mapFooterLinkPropsClient } from "./footerLink.mapping";

describe("mapFooterLinkPropsClient", () => {
	it("wires the footer-menu tracking using the parent title and the link label", () => {
		const parent = makeNode({ props: { "jcr:title": "Catégorie" } });
		const node = makeNode({ parent: parent as never });

		const result = mapFooterLinkPropsClient(node);
		expect(result).toMatchObject({ label: "Lien", href: "/l" });
		expect(result.tracking).toEqual({
			event: "click_menu_footer",
			menu_level_1: "Catégorie",
			menu_level_2: "Lien",
			menu_level_3: "",
		});
	});

	it("uses an empty level-1 when the parent cannot be read", () => {
		const node = makeNode(); // getParent throws → caught → ""
		expect(mapFooterLinkPropsClient(node).tracking?.menu_level_1).toBe("");
	});

	it("ne marque pas un lien ordinaire", () => {
		expect(mapFooterLinkPropsClient(makeNode()).isConsent).toBeUndefined();
	});

	it("marque l'entrée de consentement portant le mixin", () => {
		const node = makeNode({ nodeTypes: ["sofnt:footerLink", "sofmix:ctaConsent"] });
		expect(mapFooterLinkPropsClient(node).isConsent).toBe(true);
	});

	it("marque aussi celle qui ne porte que la propriété ctaType", () => {
		// Le mixin est posé par le Content Editor à la sélection ; un contenu importé ou
		// amorcé par script peut n'avoir que la propriété. Les deux doivent marcher.
		const node = makeNode({ props: { ctaType: "consent" } });
		expect(mapFooterLinkPropsClient(node).isConsent).toBe(true);
	});
});
