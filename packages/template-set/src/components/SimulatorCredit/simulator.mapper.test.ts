import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeNode } from "#test/jahia";
import type { CtaProps } from "sofinco-react";

vi.mock("#lib/jcr", async () => ({ ...(await import("#test/jahia")) }));

const { mockResolveAmountOptions, mockBuildCta } = vi.hoisted(() => ({
	mockResolveAmountOptions: vi.fn(),
	mockBuildCta: vi.fn(),
}));

// La cascade bornes/messages elle-même est testée dans `lib/simulatorCta.test.ts` :
// ici on ne vérifie que le passe-plat du mapper.
vi.mock("#lib/simulatorCta", () => ({
	resolveSimulatorAmountOptions: mockResolveAmountOptions,
	buildSimulatorCtaFromNode: mockBuildCta,
}));

import { mapSimulatorProps } from "./simulator.mapper";

const t = (k: string) => `t:${k}`;
const renderContext = {} as unknown as Parameters<typeof mapSimulatorProps>[1];

const ctaFixture: CtaProps = {
	label: "Simuler",
	href: "/parcours-simulateur?predefinedCreditType=PB&sourceId=ABC#/",
	target: "_self",
	ctaSection: "simulator-credit-cta",
	variant: "accent",
	props: { "data-simulator-cta": "true" } as unknown as CtaProps["props"],
};

beforeEach(() => {
	mockResolveAmountOptions.mockReset().mockReturnValue({ amountMin: 150, amountMax: 999999 });
	mockBuildCta.mockReset().mockReturnValue(ctaFixture);
});

describe("mapSimulatorProps", () => {
	it("mappe title, placeholder, bornes et CTA", () => {
		mockResolveAmountOptions.mockReturnValue({
			amountPlaceholder: "5000 €",
			amountMin: 200,
			amountMax: 100000,
		});
		const node = makeNode({ props: { "jcr:title": "Simulateur" } });

		const result = mapSimulatorProps(node, renderContext, t);

		expect(result.simulatorTitle).toBe("Simulateur");
		expect(result.amountPlaceholder).toBe("5000 €");
		expect(result.amountMin).toBe(200);
		expect(result.amountMax).toBe(100000);
		expect(result.cta?.label).toBe("Simuler");
	});

	it("laisse amountPlaceholder undefined quand rien n'est saisi — le défaut vit dans <SimulatorForm>", () => {
		const result = mapSimulatorProps(makeNode(), renderContext, t);
		expect(result.amountPlaceholder).toBeUndefined();
	});

	it("propage les bornes par défaut renvoyées par resolveSimulatorAmountOptions", () => {
		const result = mapSimulatorProps(makeNode(), renderContext, t);
		expect(result.amountMin).toBe(150);
		expect(result.amountMax).toBe(999999);
	});

	it("propage les messages d'erreur du mixin sofmix:simulatorAmount", () => {
		mockResolveAmountOptions.mockReturnValue({
			amountMin: 150,
			amountMax: 999999,
			requiredErrorMessage: "Montant obligatoire",
			minErrorMessage: "Min {min}€",
			maxErrorMessage: "Max {max}€",
		});

		const result = mapSimulatorProps(makeNode(), renderContext, t);

		expect(result.requiredErrorMessage).toBe("Montant obligatoire");
		expect(result.minErrorMessage).toBe("Min {min}€");
		expect(result.maxErrorMessage).toBe("Max {max}€");
	});

	it("laisse les messages undefined quand le contributeur n'a rien saisi", () => {
		const result = mapSimulatorProps(makeNode(), renderContext, t);
		expect(result.requiredErrorMessage).toBeUndefined();
		expect(result.minErrorMessage).toBeUndefined();
		expect(result.maxErrorMessage).toBeUndefined();
	});

	it("passe la section CTA dédiée au helper (sémantique SimulatorCredit)", () => {
		const node = makeNode({ props: { "jcr:title": "Simulateur" } });
		mapSimulatorProps(node, renderContext, t);
		expect(mockBuildCta).toHaveBeenCalledWith(node, renderContext, t, {
			ctaSection: "simulator-credit-cta",
		});
	});
});
