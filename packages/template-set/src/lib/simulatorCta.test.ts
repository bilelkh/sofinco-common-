import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeNode } from "#test/jahia";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";

// `getGlobalSettingsNode` est context-bound (site courant via useServerContext)
// donc on l'override avec un vi.fn() contrôlable pour tester la résolution via
// le settings node simulator-config. Pattern identique à cta.test.ts.
const { mockGlobalSettings } = vi.hoisted(() => ({ mockGlobalSettings: vi.fn() }));
vi.mock("#lib/jcr", async () => ({
	...(await import("#test/jahia")),
	getGlobalSettingsNode: mockGlobalSettings,
}));
vi.mock("@jahia/javascript-modules-library", () => ({
	buildNodeUrl: vi.fn((node: { getUrl(): string }) => node.getUrl()),
}));

import {
	buildSimulatorCtaUrl,
	resolveSimulatorBasePath,
	resolveSimulatorHash,
	buildSimulatorCtaFromNode,
	mapSimulatorCtaInput,
	resolveAmountBounds,
	resolveSimulatorAmountOptions,
	type SimulatorCtaInput,
} from "./simulatorCta";

const t = vi.fn((key: string) => `t:${key}`);

const rcWith = (mainNode: JCRNodeWrapper): RenderContext =>
	({ getMainResource: () => ({ getNode: () => mainNode }) }) as unknown as RenderContext;

// ============================================================================
// resolveSimulatorBasePath — fallback hardcodé (config absente)
// ============================================================================

describe("resolveSimulatorBasePath — fallback hardcodé (config absente)", () => {
	beforeEach(() => mockGlobalSettings.mockReset());

	it.each<[string, SimulatorCtaInput, string]>([
		["empty input → standard fallback", {}, "/parcours-simulateur"],
		["PB project → standard fallback", { project: "AUTO" }, "/parcours-simulateur"],
		["project=RAC → RAC fallback", { project: "RAC" }, "/parcours-simulateur-rac"],
		[
			"predefinedCreditType=RAC → RAC fallback",
			{ predefinedCreditType: "RAC" },
			"/parcours-simulateur-rac",
		],
	])("%s", (_, input, expected) => {
		expect(resolveSimulatorBasePath(input)).toBe(expected);
	});
});

describe("resolveSimulatorBasePath — config présente (settings node)", () => {
	beforeEach(() => mockGlobalSettings.mockReset());

	it("utilise buildNodeUrl(simulatorBasePage) quand le picker pointe vers une page", () => {
		const simPage = makeNode({
			nodeTypes: ["jnt:page"],
			url: "/sites/sofinco/home/parcours-simulateur",
		});
		const simRacPage = makeNode({
			nodeTypes: ["jnt:page"],
			url: "/sites/sofinco/home/parcours-simulateur-rac",
		});
		const config = makeNode({
			nodeTypes: ["sofnt:simulatorConfig"],
			props: { simulatorBasePage: simPage, simulatorRacBasePage: simRacPage },
		});
		mockGlobalSettings.mockReturnValue(config);

		expect(resolveSimulatorBasePath({ project: "AUTO" })).toBe(
			"/sites/sofinco/home/parcours-simulateur",
		);
		expect(resolveSimulatorBasePath({ project: "RAC" })).toBe(
			"/sites/sofinco/home/parcours-simulateur-rac",
		);
	});

	it("fallback hardcodé si le picker est vide", () => {
		const config = makeNode({ nodeTypes: ["sofnt:simulatorConfig"] });
		mockGlobalSettings.mockReturnValue(config);
		expect(resolveSimulatorBasePath({ project: "AUTO" })).toBe("/parcours-simulateur");
		expect(resolveSimulatorBasePath({ project: "RAC" })).toBe("/parcours-simulateur-rac");
	});
});

// ============================================================================
// resolveSimulatorHash — routing simulateur Vue.js
// ============================================================================

describe("resolveSimulatorHash", () => {
	it.each<[string, SimulatorCtaInput, string]>([
		["empty input → /", {}, "#/"],
		["RAC project → /rachat/nombre-credits", { project: "RAC" }, "#/rachat/nombre-credits"],
		["RAC via predefinedCreditType", { predefinedCreditType: "RAC" }, "#/rachat/nombre-credits"],
		["AUTO seul → /auto", { project: "AUTO" }, "#/auto"],
		["FAMILY seul → /famille-loisirs", { project: "FAMILY" }, "#/famille-loisirs"],
		["WORKS seul → /travaux", { project: "WORKS" }, "#/travaux"],
		["MISCELLANEOUS seul → /autre", { project: "MISCELLANEOUS" }, "#/autre"],
		[
			"project + subProject → /montant-financement",
			{ project: "AUTO", subProject: "AUTO_ELECTRIC_HYBRID" },
			"#/montant-financement",
		],
		[
			"MISC + sub → /montant-financement",
			{ project: "MISCELLANEOUS", subProject: "MISC_OTHER" },
			"#/montant-financement",
		],
	])("%s", (_, input, expected) => {
		expect(resolveSimulatorHash(input)).toBe(expected);
	});
});

// ============================================================================
// buildSimulatorCtaUrl — fidélité URLs PROD legacy
// ============================================================================

describe("buildSimulatorCtaUrl — fidélité URLs PROD", () => {
	it("URL PROD — credit_auto + AUTO + PB (sans amount/duration)", () => {
		const url = buildSimulatorCtaUrl({
			idcatorigin: "credit_auto",
			project: "AUTO",
			predefinedCreditType: "PB",
			sourceId: "NEOURL14",
			loa: "false",
		});
		expect(url).toBe(
			"/parcours-simulateur?idcatorigin=credit_auto&project=AUTO&predefinedCreditType=PB&sourceId=NEOURL14&loa=false#/auto",
		);
	});

	it("URL PROD — pret_personnel + MISCELLANEOUS + MISC_OTHER", () => {
		const url = buildSimulatorCtaUrl({
			idcatorigin: "pret_personnel",
			project: "MISCELLANEOUS",
			subProject: "MISC_OTHER",
			predefinedCreditType: "PB",
			sourceId: "NEOURL41",
			loa: "false",
		});
		expect(url).toBe(
			"/parcours-simulateur?idcatorigin=pret_personnel&project=MISCELLANEOUS&subProject=MISC_OTHER&predefinedCreditType=PB&sourceId=NEOURL41&loa=false#/montant-financement",
		);
	});

	it("URL PROD — RAC hardcode", () => {
		const url = buildSimulatorCtaUrl({
			project: "RAC",
			subProject: "RAC_RAC",
			predefinedCreditType: "PB",
			sourceId: "NEOURL04",
		});
		expect(url).toBe(
			"/parcours-simulateur-rac?sourceId=NEOURL04&project=RAC&subProject=RAC_RAC&creditType=PB#/rachat/nombre-credits",
		);
	});
});

// ============================================================================
// buildSimulatorCtaUrl — cas génériques + edge cases
// ============================================================================

describe("buildSimulatorCtaUrl — cas génériques", () => {
	it("input vide → URL minimale + hash root", () => {
		expect(buildSimulatorCtaUrl({})).toBe("/parcours-simulateur#/");
	});

	it("hashFragment override remplace le hash auto-calculé", () => {
		const url = buildSimulatorCtaUrl({ project: "AUTO", hashFragment: "#/custom" });
		expect(url).toBe("/parcours-simulateur?project=AUTO#/custom");
	});

	it("hashFragment sans # initial est normalisé", () => {
		const url = buildSimulatorCtaUrl({ project: "AUTO", hashFragment: "/no-slash" });
		expect(url).toBe("/parcours-simulateur?project=AUTO#/no-slash");
	});

	it("forceHash prioritaire sur hashFragment", () => {
		const url = buildSimulatorCtaUrl(
			{ project: "AUTO", hashFragment: "/from-input" },
			{ forceHash: "/from-opts" },
		);
		expect(url).toBe("/parcours-simulateur?project=AUTO#/from-opts");
	});

	it("RAC ignore les overrides idcatorigin (hardcode strict)", () => {
		const url = buildSimulatorCtaUrl({
			project: "RAC",
			sourceId: "X",
			idcatorigin: "should-be-ignored",
		});
		expect(url).not.toContain("idcatorigin");
		expect(url).toContain("project=RAC");
		expect(url).toContain("subProject=RAC_RAC");
		expect(url).toContain("creditType=PB");
	});

	it("encodage URL — caractères spéciaux dans sourceId", () => {
		const url = buildSimulatorCtaUrl({ project: "AUTO", sourceId: "ABC=DEF&GHI" });
		expect(url).toContain("sourceId=ABC%3DDEF%26GHI");
	});
});

// ============================================================================
// mapSimulatorCtaInput — bridge JCR → input typé
// ============================================================================

describe("mapSimulatorCtaInput", () => {
	it("lit les propriétés du mixin (product, sourceId, sim* restants)", () => {
		const node = makeNode({
			props: {
				simProject: "AUTO",
				simSubProject: "AUTO_ELECTRIC_HYBRID",
				product: "PB",
				sourceId: "NEOURL14",
				simLoa: "false",
				simIdcatorigin: "credit_auto",
			},
		});

		const input = mapSimulatorCtaInput(node, rcWith(node));

		expect(input).toEqual({
			project: "AUTO",
			subProject: "AUTO_ELECTRIC_HYBRID",
			predefinedCreditType: "PB",
			sourceId: "NEOURL14",
			loa: "false",
			idcatorigin: "credit_auto",
			hashFragment: undefined,
		});
	});

	it("idcatorigin vide sur CTA → fallback sur page mixin eaPageOptions.idcat", () => {
		const page = makeNode({
			nodeTypes: ["jnt:page"],
			props: { idcat: "from_page_mixin" },
		});
		const cta = makeNode({
			props: { simProject: "AUTO" },
			parent: page,
		});
		expect(mapSimulatorCtaInput(cta, rcWith(cta)).idcatorigin).toBe("from_page_mixin");
	});

	it("idcatorigin explicite sur CTA > fallback page (override)", () => {
		const page = makeNode({
			nodeTypes: ["jnt:page"],
			props: { idcat: "from_page" },
		});
		const cta = makeNode({
			props: { simProject: "AUTO", simIdcatorigin: "from_cta" },
			parent: page,
		});
		expect(mapSimulatorCtaInput(cta, rcWith(cta)).idcatorigin).toBe("from_cta");
	});

	it("loa invalide ('yes', 1, etc.) → fallback chaîne vide", () => {
		const node = makeNode({
			props: { simProject: "AUTO", simLoa: "yes" },
		});
		expect(mapSimulatorCtaInput(node, rcWith(node)).loa).toBe("");
	});
});

// ============================================================================
// Cascade CTA > page (sofmix:simulationParams)
//
// Extension de la convention posée pour `idcatorigin` : une valeur laissée vide
// sur le CTA retombe sur celle de la page, pour que le contributeur n'ait pas à
// la dupliquer sur chaque CTA. Noms volontairement différents de part et
// d'autre — `product`/`sourceId` côté CTA, `simProduct`/`simSourceId` côté page.
// ============================================================================

describe("mapSimulatorCtaInput — cascade CTA > mixin de page simulationParams", () => {
	/** Page portant le mixin de simulation. */
	const simPage = (props: Record<string, string>) =>
		makeNode({ nodeTypes: ["jnt:page", "sofmix:simulationParams"], props });

	it("product vide sur le CTA → repli sur simProduct de la page", () => {
		const page = simPage({ simProduct: "CR" });
		const cta = makeNode({ props: { simProject: "MISCELLANEOUS" }, parent: page });
		expect(mapSimulatorCtaInput(cta, rcWith(cta)).predefinedCreditType).toBe("CR");
	});

	it("sourceId vide sur le CTA → repli sur simSourceId de la page", () => {
		const page = simPage({ simProduct: "CR", simSourceId: "NEOURL02" });
		const cta = makeNode({ props: { simProject: "MISCELLANEOUS" }, parent: page });
		expect(mapSimulatorCtaInput(cta, rcWith(cta)).sourceId).toBe("NEOURL02");
	});

	it("valeurs explicites du CTA prioritaires sur la page", () => {
		const page = simPage({ simProduct: "CR", simSourceId: "PAGE_SRC" });
		const cta = makeNode({
			props: { simProject: "AUTO", product: "PB", sourceId: "CTA_SRC" },
			parent: page,
		});
		const input = mapSimulatorCtaInput(cta, rcWith(cta));
		expect(input.predefinedCreditType).toBe("PB");
		expect(input.sourceId).toBe("CTA_SRC");
	});

	it("cascade partielle : product hérité, sourceId explicite", () => {
		const page = simPage({ simProduct: "RAC", simSourceId: "PAGE_SRC" });
		const cta = makeNode({ props: { sourceId: "CTA_SRC" }, parent: page });
		const input = mapSimulatorCtaInput(cta, rcWith(cta));
		expect(input.predefinedCreditType).toBe("RAC");
		expect(input.sourceId).toBe("CTA_SRC");
	});

	it("page sans le mixin → aucun repli, comportement inchangé", () => {
		const page = makeNode({ nodeTypes: ["jnt:page"] });
		const cta = makeNode({ props: { simProject: "AUTO" }, parent: page });
		const input = mapSimulatorCtaInput(cta, rcWith(cta));
		expect(input.predefinedCreditType).toBe("");
		expect(input.sourceId).toBeUndefined();
	});

	it("le repli page traverse jusqu'à l'URL produite", () => {
		const page = simPage({ simProduct: "RAC", simSourceId: "NEOURL77" });
		const cta = makeNode({ props: {}, parent: page });
		// RAC → base RAC + hardcode strict du simulateur (project=RAC&subProject=RAC_RAC…)
		const url = buildSimulatorCtaUrl(mapSimulatorCtaInput(cta, rcWith(cta)));
		expect(url).toBe(
			"/parcours-simulateur-rac?sourceId=NEOURL77&project=RAC&subProject=RAC_RAC&creditType=PB#/rachat/nombre-credits",
		);
	});

	it("idcat et simProduct cohabitent sur la page sans interférer", () => {
		const page = makeNode({
			nodeTypes: ["jnt:page", "sofmix:simulationParams"],
			props: { idcat: "credit_conso", simProduct: "PB", simSourceId: "NEOURL14" },
		});
		const cta = makeNode({ props: { simProject: "AUTO" }, parent: page });
		expect(mapSimulatorCtaInput(cta, rcWith(cta))).toMatchObject({
			idcatorigin: "credit_conso",
			predefinedCreditType: "PB",
			sourceId: "NEOURL14",
		});
	});
});

// ============================================================================
// buildSimulatorCtaFromNode — entrée publique principale
// ============================================================================

describe("buildSimulatorCtaFromNode", () => {
	it("sans project ni sourceId → CtaProps pointant sur la home du simulateur", () => {
		const node = makeNode({ props: { ctaLabel: "Vide" } });
		const result = buildSimulatorCtaFromNode(node, rcWith(node), t);
		expect(result).not.toBeNull();
		expect(result!.label).toBe("Vide");
		expect(result!.href).toContain("/parcours-simulateur");
		expect(result!.href).toContain("#/"); // home simulateur
	});

	it("allowEmptyTarget=true → retourne un CtaProps même sans project/sourceId", () => {
		const node = makeNode({ props: { ctaLabel: "Mon bouton" } });
		const result = buildSimulatorCtaFromNode(node, rcWith(node), t, {
			ctaSection: "simulator-credit-cta",
		});
		expect(result).not.toBeNull();
		expect(result!.label).toBe("Mon bouton");
		expect(result!.href).toContain("/parcours-simulateur");
		expect(result!.href).toContain("#/"); // home simulateur
		expect(result!.ctaSection).toBe("simulator-credit-cta");
	});

	it("allowEmptyTarget=true + ctaLabel vide → utilise translation par défaut", () => {
		const result = buildSimulatorCtaFromNode(makeNode(), rcWith(makeNode()), t, {});
		expect(result!.label).toBe("t:simulatorCta.defaultLabel");
	});

	it("produit CtaProps avec href, label, data-simulator-cta", () => {
		const node = makeNode({
			props: {
				ctaLabel: "Je simule",
				simProject: "AUTO",
				product: "PB",
				sourceId: "NEOURL14",
				simLoa: "false",
				simIdcatorigin: "credit_auto",
			},
		});
		const result = buildSimulatorCtaFromNode(node, rcWith(node), t, { ctaSection: "hero" });

		expect(result).not.toBeNull();
		expect(result!.label).toBe("Je simule");
		expect(result!.href).toContain("/parcours-simulateur?");
		expect(result!.href).toContain("project=AUTO");
		expect(result!.href).toContain("predefinedCreditType=PB");
		expect(result!.href).toContain("sourceId=NEOURL14");
		expect(result!.href).toContain("#/auto");
		expect(result!.ctaSection).toBe("hero");
		expect(result!.props).toMatchObject({ "data-simulator-cta": "true" });
	});

	it("label fallback i18n quand ctaLabel vide", () => {
		const node = makeNode({ props: { simProject: "AUTO" } });
		expect(buildSimulatorCtaFromNode(node, rcWith(node), t)!.label).toBe(
			"t:simulatorCta.defaultLabel",
		);
	});

	it("RAC → /parcours-simulateur-rac + #/rachat/nombre-credits", () => {
		const node = makeNode({
			props: { simProject: "RAC", sourceId: "NEOURL04" },
		});
		const result = buildSimulatorCtaFromNode(node, rcWith(node), t);
		expect(result!.href).toContain("/parcours-simulateur-rac?");
		expect(result!.href).toContain("#/rachat/nombre-credits");
	});

	it("sourceId seul (sans project) → CTA rendu, hash = /", () => {
		const node = makeNode({ props: { sourceId: "X" } });
		const result = buildSimulatorCtaFromNode(node, rcWith(node), t);
		expect(result).not.toBeNull();
		expect(result!.href).toContain("sourceId=X");
		expect(result!.href).toContain("#/");
	});
});

// ============================================================================
// resolveAmountBounds — cascade settings-node → defaults hardcodés
// ============================================================================

describe("resolveAmountBounds", () => {
	beforeEach(() => mockGlobalSettings.mockReset());

	it("lit amountMin/amountMax depuis le settings node simulator-config", () => {
		const config = makeNode({
			nodeTypes: ["sofnt:simulatorConfig"],
			props: { amountMin: 200, amountMax: 100000 },
		});
		mockGlobalSettings.mockReturnValue(config);
		expect(resolveAmountBounds()).toEqual({ amountMin: 200, amountMax: 100000 });
	});

	it("fallback defaults hardcodés quand le settings node existe mais sans bornes", () => {
		const config = makeNode({ nodeTypes: ["sofnt:simulatorConfig"] });
		mockGlobalSettings.mockReturnValue(config);
		expect(resolveAmountBounds()).toEqual({ amountMin: 150, amountMax: 999999 });
	});

	it("fallback defaults hardcodés quand le settings node est absent", () => {
		mockGlobalSettings.mockReturnValue(null);
		expect(resolveAmountBounds()).toEqual({ amountMin: 150, amountMax: 999999 });
	});
});

// ============================================================================
// resolveSimulatorAmountOptions — mixin sofmix:simulatorAmount
// ============================================================================

describe("resolveSimulatorAmountOptions", () => {
	beforeEach(() => {
		mockGlobalSettings.mockReset();
		// Config globale de référence pour toute la section.
		mockGlobalSettings.mockReturnValue(
			makeNode({
				nodeTypes: ["sofnt:simulatorConfig"],
				props: { amountMin: 150, amountMax: 999999 },
			}),
		);
	});

	it("hérite des bornes globales quand le nœud ne surcharge rien", () => {
		expect(resolveSimulatorAmountOptions(makeNode())).toMatchObject({
			amountMin: 150,
			amountMax: 999999,
		});
	});

	it("laisse les bornes du nœud primer sur la config globale", () => {
		const node = makeNode({ props: { amountMin: 500, amountMax: 50000 } });
		expect(resolveSimulatorAmountOptions(node)).toMatchObject({
			amountMin: 500,
			amountMax: 50000,
		});
	});

	it("surcharge indépendante : seul amountMin est saisi", () => {
		const node = makeNode({ props: { amountMin: 1000 } });
		expect(resolveSimulatorAmountOptions(node)).toMatchObject({
			amountMin: 1000,
			amountMax: 999999,
		});
	});

	it("réordonne des bornes inversées pour garder le formulaire soumettable", () => {
		const node = makeNode({ props: { amountMin: 50000, amountMax: 500 } });
		expect(resolveSimulatorAmountOptions(node)).toMatchObject({
			amountMin: 500,
			amountMax: 50000,
		});
	});

	it("remonte le placeholder saisi, et undefined sinon (défaut porté par <SimulatorForm>)", () => {
		expect(
			resolveSimulatorAmountOptions(makeNode({ props: { amountPlaceholder: "Mon montant" } }))
				.amountPlaceholder,
		).toBe("Mon montant");
		expect(resolveSimulatorAmountOptions(makeNode()).amountPlaceholder).toBeUndefined();
	});

	it("remonte les trois messages d'erreur saisis", () => {
		const node = makeNode({
			props: {
				requiredErrorMessage: "Montant obligatoire",
				minErrorMessage: "Min {min}€",
				maxErrorMessage: "Max {max}€",
			},
		});
		expect(resolveSimulatorAmountOptions(node)).toMatchObject({
			requiredErrorMessage: "Montant obligatoire",
			minErrorMessage: "Min {min}€",
			maxErrorMessage: "Max {max}€",
		});
	});

	it("renvoie undefined (et non une chaîne vide) pour un message non saisi, afin que le défaut React s'applique", () => {
		const node = makeNode({ props: { minErrorMessage: "Min {min}€" } });
		const result = resolveSimulatorAmountOptions(node);

		expect(result.minErrorMessage).toBe("Min {min}€");
		expect(result.requiredErrorMessage).toBeUndefined();
		expect(result.maxErrorMessage).toBeUndefined();
	});
});
