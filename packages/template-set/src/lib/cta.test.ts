import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeNode } from "#test/jahia";
import type { TFunction } from "#lib/i18n";

// `getGlobalSettingsNode` is context-bound (not derivable from a single node), so the
// shared #test/jahia mock hardcodes it to null. Override it with a controllable spy here
// so buildSimulatorCta can reach its URL-building branches.
const { mockGlobalSettings } = vi.hoisted(() => ({ mockGlobalSettings: vi.fn() }));
vi.mock("#lib/jcr", async () => ({
	...(await import("#test/jahia")),
	getGlobalSettingsNode: mockGlobalSettings,
}));
vi.mock("@jahia/javascript-modules-library", () => ({
	buildNodeUrl: vi.fn((node: { getUrl(): string }) => node.getUrl()),
}));

import { getCtaProps, getCtaPropsWithMode, getRequiredCtaProps, buildSimulatorCta } from "./cta";

/** Echoing translator — returns the key so the default-label fallback is assertable. */
const t = vi.fn((key: string) => key) as unknown as TFunction;

describe("getCtaProps", () => {
	it("resolves an internal CTA (sofmix:ctaInternal) to the linked node URL", () => {
		const target = makeNode({ url: "/page", props: { "jcr:title": "Page title" } });
		const node = makeNode({
			nodeTypes: ["sofmix:ctaInternal"],
			props: { ctaInternalNode: target, ctaLabel: "Voir l'offre", ctaTarget: "_blank" },
		});
		expect(getCtaProps(node, "hero-cta")).toEqual({
			label: "Voir l'offre",
			href: "/page",
			target: "_blank",
			ctaSection: "hero-cta",
			variant: "accent",
		});
	});

	it("falls back to the linked node's title then to 'En savoir plus'", () => {
		const target = makeNode({ url: "/p", props: { "jcr:title": "Node title" } });
		const node = makeNode({
			nodeTypes: ["sofmix:ctaInternal"],
			props: { ctaInternalNode: target },
		});
		expect(getCtaProps(node, "s")?.label).toBe("Node title");

		const noTitle = makeNode({ url: "/p" });
		const node2 = makeNode({
			nodeTypes: ["sofmix:ctaInternal"],
			props: { ctaInternalNode: noTitle },
		});
		expect(getCtaProps(node2, "s")?.label).toBe("En savoir plus");
	});

	it("resolves an external CTA (sofmix:ctaExternal)", () => {
		const node = makeNode({
			nodeTypes: ["sofmix:ctaExternal"],
			props: { ctaExternalUrl: "https://ex.com", ctaLabel: "Externe" },
		});
		expect(getCtaProps(node, "s", "primary")).toEqual({
			label: "Externe",
			href: "https://ex.com",
			target: "_self",
			ctaSection: "s",
			variant: "primary",
		});
	});

	it("reads the ctaType switch on a generic sofmix:cta", () => {
		const node = makeNode({
			props: { ctaType: "external", ctaExternalUrl: "https://x", ctaLabel: "L" },
		});
		expect(getCtaProps(node, "s")?.href).toBe("https://x");
	});

	it("returns null when ctaType is none / unset", () => {
		expect(getCtaProps(makeNode({ props: { ctaType: "none" } }), "s")).toBeNull();
		expect(getCtaProps(makeNode(), "s")).toBeNull();
	});

	it("returns null when the resolved href is empty", () => {
		const node = makeNode({ props: { ctaType: "external", ctaLabel: "L" } });
		expect(getCtaProps(node, "s")).toBeNull();
	});

	it("returns null for an internal CTA with no linked node (empty href)", () => {
		const node = makeNode({ nodeTypes: ["sofmix:ctaInternal"], props: { ctaLabel: "L" } });
		expect(getCtaProps(node, "s")).toBeNull();
	});

	/*
	 * Mode `consent` : ce `href` n'atteint PAS le DOM. Le design system rend l'entrée avec
	 * un `<button>` sans destination, et c'est `data-consent-action` — pas l'ancre — qui
	 * fait contrat avec le délégué de clic du `<head>` (`#lib/consent-bootstrap`, dont le
	 * test vérifie explicitement qu'une ancre ne déclenche plus rien).
	 *
	 * La valeur reste figée ici pour une autre raison : un `href` vide ferait écarter le
	 * CTA par `getCtaProps` comme un lien sans cible (cf. `#lib/cta`). C'est un remplissage
	 * nommé, et ce test garantit qu'il ne redevient pas silencieusement vide.
	 */
	it("résout l'entrée de consentement vers l'ancre reconnue par le délégué", () => {
		const node = makeNode({
			nodeTypes: ["sofmix:ctaConsent"],
			props: { ctaLabel: "Gérer mes cookies" },
		});
		expect(getCtaProps(node, "footer-link")).toEqual({
			label: "Gérer mes cookies",
			href: "#gerer-mes-cookies",
			target: "_self",
			ctaSection: "footer-link",
			variant: "accent",
		});
	});

	it("reconnaît aussi le consentement par sa seule propriété ctaType", () => {
		// Le mixin est posé par le Content Editor à la sélection ; un contenu importé ou
		// amorcé par script peut n'avoir que la propriété. Les deux doivent marcher.
		const node = makeNode({ props: { ctaType: "consent", ctaLabel: "Cookies" } });
		expect(getCtaProps(node, "footer-link")?.href).toBe("#gerer-mes-cookies");
	});
});

describe("getCtaPropsWithMode", () => {
	/*
	 * `getCtaProps` délègue à cette fonction : le test ci-dessous vérifie que les deux
	 * rendent exactement les mêmes props, condition pour que la délégation reste sûre.
	 */
	it("rend les mêmes props que getCtaProps, avec le mode en plus", () => {
		const node = makeNode({
			nodeTypes: ["sofmix:ctaExternal"],
			props: { ctaExternalUrl: "https://sofinco.fr", ctaLabel: "Voir" },
		});

		const { props, mode } = getCtaPropsWithMode(node, "s");

		expect(mode).toBe("external");
		expect(props).toEqual(getCtaProps(node, "s"));
	});

	it("rend le mode même quand aucune props n'est résolue", () => {
		// Cas `none` : l'appelant peut avoir besoin de savoir POURQUOI il n'a rien reçu.
		const { props, mode } = getCtaPropsWithMode(makeNode(), "s");

		expect(props).toBeNull();
		expect(mode).toBe("none");
	});

	it("rend le mode consent, que l'appelant utilise pour marquer l'entrée", () => {
		const node = makeNode({ nodeTypes: ["sofmix:ctaConsent"], props: { ctaLabel: "Cookies" } });

		expect(getCtaPropsWithMode(node, "footer-link").mode).toBe("consent");
	});
});

describe("getRequiredCtaProps", () => {
	it("always returns CtaProps, falling back to an empty href", () => {
		expect(getRequiredCtaProps(makeNode({ props: { ctaLabel: "L" } }), "s")).toEqual({
			label: "L",
			href: "",
			target: "_self",
			ctaSection: "s",
			variant: "accent",
		});
	});
});

describe("buildSimulatorCta", () => {
	const config = (props = {}) => makeNode({ props });
	/** Component node with a `simulator` child carrying product/sourceId (+ amount/duration). */
	const componentNode = (
		nodeProps: Record<string, string | number | boolean> = {},
		simProps: Record<string, string | number | boolean> = {},
	) =>
		makeNode({
			props: nodeProps,
			named: { simulator: makeNode({ props: { product: "PB", sourceId: "SRC1", ...simProps } }) },
		});

	beforeEach(() => {
		vi.clearAllMocks();
		mockGlobalSettings.mockReturnValue(config());
	});

	describe("guards → undefined", () => {
		it("returns undefined when there is no simulator child", () => {
			expect(buildSimulatorCta(makeNode(), "s", t)).toBeUndefined();
		});

		it("returns undefined when product is missing", () => {
			const node = makeNode({ named: { simulator: makeNode({ props: { sourceId: "X" } }) } });
			expect(buildSimulatorCta(node, "s", t)).toBeUndefined();
		});

		it("returns undefined when sourceId is missing", () => {
			const node = makeNode({ named: { simulator: makeNode({ props: { product: "PB" } }) } });
			expect(buildSimulatorCta(node, "s", t)).toBeUndefined();
		});

		it("returns undefined when the global config node is absent", () => {
			mockGlobalSettings.mockReturnValue(null);
			expect(buildSimulatorCta(componentNode(), "s", t)).toBeUndefined();
			expect(mockGlobalSettings).toHaveBeenCalledWith("representative-example-config");
		});
	});

	describe("label", () => {
		it("uses the editorial ctaLabel when set", () => {
			expect(buildSimulatorCta(componentNode({ ctaLabel: "Je simule" }), "s", t)?.label).toBe(
				"Je simule",
			);
		});

		it("falls back to the translated default label", () => {
			expect(buildSimulatorCta(componentNode(), "s", t)?.label).toBe(
				"representativeExample.cta.defaultLabel",
			);
		});
	});

	describe("PB/CR URL", () => {
		it("builds the full /parcours-simulateur URL with every optional param", () => {
			mockGlobalSettings.mockReturnValue(config({ simulatorLoanUrl: "/sim-loan" }));
			const node = componentNode(
				{
					simProject: "AUTO",
					simSubProject: "NEUF",
					simIdcatorigin: "ID1",
					simMfactoryid: "MF1",
					simHashFragment: "auto",
					simClassicSubscription: true,
				},
				{ amount: 5000, dueNumber: 24 },
			);

			expect(buildSimulatorCta(node, "repex", t)).toEqual({
				label: "representativeExample.cta.defaultLabel",
				href:
					"/sim-loan?predefinedCreditType=PB&creditTypeFixed=true&sourceId=SRC1" +
					"&amount=5000&duration=24&project=AUTO&subProject=NEUF&loa=false" +
					"&idcatorigin=ID1&mfactoryid=MF1&classicSubscription=true#/auto",
				target: "_self",
				ctaSection: "repex",
				variant: "accent",
			});
		});

		it("defaults creditTypeFixed to true and loa to false; omits zero amount/duration and blank tracking", () => {
			mockGlobalSettings.mockReturnValue(config({ simulatorLoanUrl: "/sim-loan" }));
			const href = buildSimulatorCta(componentNode({}, { amount: 0, dueNumber: 0 }), "s", t)?.href;
			expect(href).toBe(
				"/sim-loan?predefinedCreditType=PB&creditTypeFixed=true&sourceId=SRC1&loa=false",
			);
		});

		it("honours explicit simCreditTypeFixed=false and simLoa=true", () => {
			mockGlobalSettings.mockReturnValue(config({ simulatorLoanUrl: "/sim-loan" }));
			const href = buildSimulatorCta(
				componentNode({ simCreditTypeFixed: false, simLoa: true }),
				"s",
				t,
			)?.href;
			expect(href).toContain("creditTypeFixed=false");
			expect(href).toContain("loa=true");
		});

		it("falls back to the hardcoded base path when the config has no URL", () => {
			const href = buildSimulatorCta(componentNode(), "s", t)?.href;
			expect(href?.startsWith("/parcours-simulateur?")).toBe(true);
		});

		it("keeps a hash fragment that already starts with a slash", () => {
			mockGlobalSettings.mockReturnValue(config({ simulatorLoanUrl: "/sim-loan" }));
			const href = buildSimulatorCta(componentNode({ simHashFragment: "/montant" }), "s", t)?.href;
			expect(href?.endsWith("#/montant")).toBe(true);
		});
	});

	describe("RAC URL", () => {
		it("uses creditType=PB, the RAC base path, and omits predefinedCreditType/loa", () => {
			mockGlobalSettings.mockReturnValue(config({ simulatorRacUrl: "/sim-rac" }));
			const node = componentNode({ ctaLabel: "Rachat" }, { product: "RAC", sourceId: "SRC2" });

			expect(buildSimulatorCta(node, "s", t)).toEqual({
				label: "Rachat",
				href: "/sim-rac?creditType=PB&sourceId=SRC2",
				target: "_self",
				ctaSection: "s",
				variant: "accent",
			});
		});

		it("falls back to /parcours-simulateur-rac when no RAC URL is configured", () => {
			const href = buildSimulatorCta(
				componentNode({}, { product: "RAC", sourceId: "SRC2" }),
				"s",
				t,
			)?.href;
			expect(href?.startsWith("/parcours-simulateur-rac?")).toBe(true);
		});
	});
});

// buildProductHeroSimCta a été retiré — ProductHero utilise désormais le helper
// partagé `buildSimulatorCtaFromNode` (cf. simulatorCta.test.ts pour la suite
// de tests dédiée).
