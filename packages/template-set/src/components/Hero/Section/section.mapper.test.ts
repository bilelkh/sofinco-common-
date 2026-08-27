import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("../Hero/hero.mapper", () => ({ mapHeroProps: vi.fn(() => ({ variant: "v1" })) }));
vi.mock("#cms/QrSticker/qr.mapper", () => ({
	mapQrStickerProps: vi.fn(() => ({ src: "qr.png", isActive: true })),
}));
vi.mock("#cms/SimulatorCredit/simulator.mapper", () => ({
	mapSimulatorProps: vi.fn(() => ({ simulatorTitle: "Sim" })),
}));

const t = (k: string) => k;
const renderContext = {} as unknown as Parameters<typeof mapSectionProps>[1];
import { mapSectionProps } from "./section.mapper";

describe("mapSectionProps", () => {
	it("maps each present child into its slot", () => {
		const node = makeNode({
			named: {
				hero: makeNode({ id: "h" }),
				simulator: makeNode({ id: "s" }),
				heroQr: makeNode({ id: "q" }),
			},
		});
		expect(mapSectionProps(node, renderContext, t)).toEqual({
			hero: { variant: "v1" },
			qrApp: { src: "qr.png", isActive: true },
			simulator: { simulatorTitle: "Sim" },
		});
	});

	it("returns an empty object when no children are present", () => {
		expect(mapSectionProps(makeNode(), renderContext, t)).toEqual({});
	});
});
