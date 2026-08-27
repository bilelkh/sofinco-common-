import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeNode } from "#test/jahia";
import type { CtaProps } from "sofinco-react";

vi.mock("#lib/jcr", () => import("#test/jahia"));

const { mockBuildCta, mockResolveAmountOptions } = vi.hoisted(() => ({
	mockBuildCta: vi.fn(),
	mockResolveAmountOptions: vi.fn(),
}));

// La cascade bornes/messages elle-même est testée dans `lib/simulatorCta.test.ts` :
// ici on ne vérifie que le passe-plat du mapper.
vi.mock("#lib/simulatorCta", () => ({
	buildSimulatorCtaFromNode: mockBuildCta,
	resolveSimulatorAmountOptions: mockResolveAmountOptions,
}));

import { mapSimulatorBlockProps } from "./simulatorBlock.mapping";

const t = (k: string) => `t:${k}`;
const renderContext = {} as unknown as Parameters<typeof mapSimulatorBlockProps>[1];

const ctaFixture: CtaProps = {
	label: "Je simule",
	href: "/parcours-simulateur?project=AUTO&sourceId=NEOURL41#/montant-financement",
	target: "_self",
	ctaSection: "simulator-block-cta",
	variant: "accent",
	props: { "data-simulator-cta": "true" } as unknown as CtaProps["props"],
};

beforeEach(() => {
	mockBuildCta.mockReset().mockReturnValue(ctaFixture);
	mockResolveAmountOptions.mockReset().mockReturnValue({ amountMin: 150, amountMax: 999999 });
});

describe("mapSimulatorBlockProps", () => {
	it("mappe title, placeholder, bornes et CTA prêt à passer au DS", () => {
		mockResolveAmountOptions.mockReturnValue({
			amountPlaceholder: "J'ai besoin de",
			amountMin: 150,
			amountMax: 999999,
		});
		const node = makeNode({
			props: { "jcr:title": "Financez vos projets", "titleLevel": "h1" },
		});

		const result = mapSimulatorBlockProps(node, renderContext, t);

		expect(result.title).toEqual({ children: "Financez vos projets", as: "h1" });
		expect(result.amountPlaceholder).toBe("J'ai besoin de");
		expect(result.amountMin).toBe(150);
		expect(result.amountMax).toBe(999999);
		expect(result.cta).toBe(ctaFixture);
		expect(result.cta?.href).toContain("#/montant-financement");
	});

	it("propage les messages d'erreur du mixin sofmix:simulatorAmount", () => {
		mockResolveAmountOptions.mockReturnValue({
			amountMin: 150,
			amountMax: 999999,
			requiredErrorMessage: "Montant obligatoire",
			minErrorMessage: "Min {min}€",
			maxErrorMessage: "Max {max}€",
		});

		const result = mapSimulatorBlockProps(makeNode(), renderContext, t);

		expect(result.requiredErrorMessage).toBe("Montant obligatoire");
		expect(result.minErrorMessage).toBe("Min {min}€");
		expect(result.maxErrorMessage).toBe("Max {max}€");
	});

	it("laisse les messages undefined quand le contributeur n'a rien saisi", () => {
		const result = mapSimulatorBlockProps(makeNode(), renderContext, t);
		expect(result.requiredErrorMessage).toBeUndefined();
		expect(result.minErrorMessage).toBeUndefined();
		expect(result.maxErrorMessage).toBeUndefined();
	});

	it("passe la ctaSection dédiée au helper central", () => {
		const node = makeNode();
		mapSimulatorBlockProps(node, renderContext, t);
		expect(mockBuildCta).toHaveBeenCalledWith(node, renderContext, t, {
			ctaSection: "simulator-block-cta",
		});
	});

	it("propage les bornes amount résolues (nœud puis settings node global)", () => {
		mockResolveAmountOptions.mockReturnValue({ amountMin: 200, amountMax: 100000 });
		const result = mapSimulatorBlockProps(makeNode(), renderContext, t);
		expect(result.amountMin).toBe(200);
		expect(result.amountMax).toBe(100000);
	});

	it("laisse amountPlaceholder undefined et applique le niveau h2 par défaut", () => {
		const result = mapSimulatorBlockProps(makeNode(), renderContext, t);
		// Le défaut du placeholder vit dans <SimulatorForm>, pas dans le mapper.
		expect(result.amountPlaceholder).toBeUndefined();
		expect(result.title.children).toBe("");
		expect(result.title.as).toBe("h2");
	});

	it("transmet cta=null tel quel quand le helper renvoie null (cas extrême)", () => {
		mockBuildCta.mockReturnValue(null);
		const result = mapSimulatorBlockProps(makeNode(), renderContext, t);
		expect(result.cta).toBeNull();
	});
});
