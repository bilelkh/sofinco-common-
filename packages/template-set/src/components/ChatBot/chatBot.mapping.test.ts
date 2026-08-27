import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeNode } from "#test/jahia";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { PropValue } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("@jahia/javascript-modules-library", () => ({
	buildNodeUrl: vi.fn((node: { getUrl(): string }) => node.getUrl()),
}));
vi.mock("#lib/cacheDependency", () => ({ addSubtreeCacheDependency: vi.fn() }));

const { mockBuildCta, mockResolveAmountOptions } = vi.hoisted(() => ({
	mockBuildCta: vi.fn(),
	mockResolveAmountOptions: vi.fn(),
}));

// La cascade bornes/messages elle-même est testée dans `lib/simulatorCta.test.ts` :
// ici on ne vérifie que le passe-plat du mapper vers `Category.simulator`.
vi.mock("#lib/simulatorCta", () => ({
	buildSimulatorCtaFromNode: mockBuildCta,
	resolveSimulatorAmountOptions: mockResolveAmountOptions,
	SIMULATOR_HASH: { FUNDING_AMOUNT: "/montant-financement" },
}));

import { addSubtreeCacheDependency } from "#lib/cacheDependency";
import { mapChatBotData } from "./chatBot.mapping";

const CATEGORY = "sofnt:chatBotCategory";
const LEAF = "sofnt:chatBotLeaf";
const SIM_LEAF = "sofnt:chatBotSimulatorLeaf";

// Signature stubs threaded to the simulator leaf mapper.
const t = (k: string) => `t:${k}`;
const renderContext = {} as unknown as Parameters<typeof mapChatBotData>[3];

/** Wrapper qui fige renderContext + t pour alléger les appels. */
const run = (root: JCRNodeWrapper, greeting = "g", question = "q") =>
	mapChatBotData(root, greeting, question, renderContext, t);

const leaf = (props: Record<string, PropValue> = {}): JCRNodeWrapper =>
	makeNode({
		nodeTypes: [LEAF],
		props: { label: "L", conclusion: "C", features: ["f"], ...props },
	});

const simLeaf = (props: Record<string, PropValue> = {}): JCRNodeWrapper =>
	makeNode({
		nodeTypes: [SIM_LEAF],
		props: {
			conclusion: "Conclusion simulateur",
			features: ["A"],
			productCtaLabel: "Je découvre le prêt personnel",
			simProject: "AUTO",
			...props,
		},
	});

const category = (props: Record<string, PropValue>, children: JCRNodeWrapper[]): JCRNodeWrapper =>
	makeNode({ nodeTypes: [CATEGORY], props: { label: "Cat", question: "Q", ...props }, children });

const chatBot = (children: JCRNodeWrapper[]): JCRNodeWrapper =>
	makeNode({ nodeTypes: ["sofnt:chatBot"], children });

beforeEach(() => {
	mockBuildCta.mockReset().mockReturnValue({
		label: "Je simule mon prêt",
		href: "/parcours-simulateur?project=AUTO#/montant-financement",
	});
	mockResolveAmountOptions.mockReset().mockReturnValue({ amountMin: 150, amountMax: 999999 });
});

describe("mapChatBotData — arbitrary nesting depth", () => {
	it("preserves a 4-level branch ending in a leaf (the old 2-level regression)", () => {
		const root = chatBot([
			category({ label: "L1" }, [
				category({ label: "L2" }, [
					category({ label: "L3" }, [leaf({ label: "leaf", conclusion: "deep" })]),
				]),
			]),
		]);

		const data = run(root, "Hello", "Question?");

		const l1 = data.categories[0];
		const l2 = l1.children![0];
		const l3 = l2.children![0];
		const response = l3.children![0];

		expect(l1.label).toBe("L1");
		expect(l3.label).toBe("L3");
		expect(response.conclusion).toBe("deep");
		// intermediate nodes are categories (question + children), not responses
		expect(l3.conclusion).toBeUndefined();
		expect(response.children).toBeUndefined();
	});

	it("supports mixed depth across sibling branches", () => {
		const root = chatBot([
			category({ label: "shallow" }, [leaf({ label: "a", conclusion: "shallow-answer" })]),
			category({ label: "deep" }, [
				category({ label: "deep-2" }, [
					category({ label: "deep-3" }, [leaf({ label: "b", conclusion: "deep-answer" })]),
				]),
			]),
		]);

		const data = run(root);

		expect(data.categories[0].children![0].conclusion).toBe("shallow-answer");
		expect(data.categories[1].children![0].children![0].children![0].conclusion).toBe(
			"deep-answer",
		);
	});

	it("keeps authored child order when a category mixes leaves and sub-categories", () => {
		const root = chatBot([
			category({ label: "mix" }, [
				leaf({ label: "first-leaf", conclusion: "x" }),
				category({ label: "middle-cat" }, [leaf({ label: "nested", conclusion: "y" })]),
				leaf({ label: "last-leaf", conclusion: "z" }),
			]),
		]);

		const children = run(root).categories[0].children!;

		expect(children.map((c) => c.label)).toEqual(["first-leaf", "middle-cat", "last-leaf"]);
		expect(children[0].conclusion).toBe("x"); // leaf
		expect(children[1].question).toBe("Q"); // category
		expect(children[2].conclusion).toBe("z"); // leaf
	});

	it("maps an empty category to an empty children list (no invented response)", () => {
		const root = chatBot([category({ label: "empty" }, [])]);
		expect(run(root).categories[0].children).toEqual([]);
	});
});

describe("mapChatBotData — leaf fields & link resolution", () => {
	it("maps label, conclusion and multi-valued features", () => {
		const root = chatBot([
			category({}, [
				leaf({ label: "Moins de 3000 €", conclusion: "Réponse", features: ["A", "B"] }),
			]),
		]);
		const response = run(root).categories[0].children![0];
		expect(response).toMatchObject({
			label: "Moins de 3000 €",
			conclusion: "Réponse",
			features: ["A", "B"],
		});
	});

	it("resolves the href from a j:linknode reference", () => {
		const target = makeNode({ url: "/dest" });
		const root = chatBot([
			category({}, [leaf({ "j:linknode": target as unknown as PropValue, "ctaLabel": "Voir" })]),
		]);
		const response = run(root).categories[0].children![0];
		expect(response.ctaUrl).toBe("/dest");
		expect(response.ctaLabel).toBe("Voir");
	});

	it("falls back to j:url when there is no linked node", () => {
		const root = chatBot([category({}, [leaf({ "j:url": "https://x" })])]);
		expect(run(root).categories[0].children![0].ctaUrl).toBe("https://x");
	});

	it('falls back to "#" when neither a linked node nor a url is set', () => {
		const root = chatBot([category({}, [leaf({})])]);
		expect(run(root).categories[0].children![0].ctaUrl).toBe("#");
	});

	it("exposes ctaTarget when present and undefined when absent", () => {
		const withTarget = chatBot([category({}, [leaf({ "j:target": "_blank" })])]);
		const withoutTarget = chatBot([category({}, [leaf({})])]);
		expect(run(withTarget).categories[0].children![0].ctaTarget).toBe("_blank");
		expect(run(withoutTarget).categories[0].children![0].ctaTarget).toBeUndefined();
	});
});

describe("mapChatBotData — simulator leaf", () => {
	it("maps the full simulator-leaf DTO: product CTA + simulator payload", () => {
		// Le placeholder transite désormais par le helper (mixin sofmix:simulatorAmount).
		mockResolveAmountOptions.mockReturnValue({
			amountPlaceholder: "J'ai besoin de",
			amountMin: 150,
			amountMax: 999999,
		});
		const root = chatBot([category({}, [simLeaf({ "j:url": "/produit" })])]);

		const response = run(root).categories[0].children![0];

		// Feuille terminale sans puce : pas de label, mais une conclusion.
		expect(response.label).toBe("");
		expect(response.conclusion).toBe("Conclusion simulateur");
		expect(response.features).toEqual(["A"]);
		// CTA produit (navy)
		expect(response.ctaLabel).toBe("Je découvre le prêt personnel");
		expect(response.ctaUrl).toBe("/produit");
		// CTA simulateur (turquoise) + champ montant
		expect(response.simulator).toEqual({
			amountPlaceholder: "J'ai besoin de",
			amountCtaLabel: undefined,
			amountMin: 150,
			amountMax: 999999,
			simulatorCtaLabel: "Je simule mon prêt",
			simulatorCtaUrl: "/parcours-simulateur?project=AUTO#/montant-financement",
			project: "AUTO",
		});
	});

	it("resolves the product href from a j:linknode reference", () => {
		const target = makeNode({ url: "/dest" });
		const root = chatBot([
			category({}, [simLeaf({ "j:linknode": target as unknown as PropValue })]),
		]);
		expect(run(root).categories[0].children![0].ctaUrl).toBe("/dest");
	});

	it('falls back the product href to "#" when neither a linked node nor a url is set', () => {
		const root = chatBot([category({}, [simLeaf()])]);
		expect(run(root).categories[0].children![0].ctaUrl).toBe("#");
	});

	it("propage les bornes résolues pour la feuille (helper appelé sur la feuille)", () => {
		mockResolveAmountOptions.mockReturnValue({ amountMin: 500, amountMax: 50000 });
		const leaf = simLeaf();
		const root = chatBot([category({}, [leaf])]);
		const { simulator } = run(root).categories[0].children![0];

		expect(simulator).toMatchObject({ amountMin: 500, amountMax: 50000 });
		// Le helper doit lire la FEUILLE, pas la catégorie parente.
		expect(mockResolveAmountOptions).toHaveBeenCalledWith(leaf);
	});

	it("propage les messages d'erreur du mixin sofmix:simulatorAmount", () => {
		mockResolveAmountOptions.mockReturnValue({
			amountMin: 150,
			amountMax: 999999,
			requiredErrorMessage: "Montant obligatoire",
			minErrorMessage: "Min {min}€",
			maxErrorMessage: "Max {max}€",
		});
		const root = chatBot([category({}, [simLeaf()])]);
		const { simulator } = run(root).categories[0].children![0];

		expect(simulator).toMatchObject({
			requiredErrorMessage: "Montant obligatoire",
			minErrorMessage: "Min {min}€",
			maxErrorMessage: "Max {max}€",
		});
	});

	it("falls back to default label + # url when buildSimulatorCtaFromNode returns null", () => {
		mockBuildCta.mockReturnValue(null);
		const root = chatBot([category({}, [simLeaf()])]);
		const { simulator } = run(root).categories[0].children![0];
		expect(simulator!.simulatorCtaLabel).toBe("t:simulatorCta.defaultLabel");
		expect(simulator!.simulatorCtaUrl).toBe("#");
	});

	it("passes the dedicated ctaSection + forced funding-amount hash to the central helper", () => {
		const node = simLeaf();
		run(chatBot([category({}, [node])]));
		expect(mockBuildCta).toHaveBeenCalledWith(node, renderContext, t, {
			ctaSection: "chatbot-result-cta",
			forceHash: "/montant-financement",
		});
	});

	it("leaves amountPlaceholder/amountCtaLabel undefined when unset", () => {
		const root = chatBot([category({}, [simLeaf()])]);
		const { simulator } = run(root).categories[0].children![0];
		expect(simulator!.amountPlaceholder).toBeUndefined();
		expect(simulator!.amountCtaLabel).toBeUndefined();
	});

	it("drops project to undefined when simProject is empty", () => {
		const root = chatBot([category({}, [simLeaf({ simProject: "" })])]);
		expect(run(root).categories[0].children![0].simulator!.project).toBeUndefined();
	});

	it("preserves authored order across a category + leaf + sim-leaf mix", () => {
		const root = chatBot([
			category({}, [
				leaf({ label: "plain", conclusion: "x" }),
				simLeaf({ productCtaLabel: "sim" }),
			]),
		]);
		const children = run(root).categories[0].children!;
		expect(children).toHaveLength(2);
		expect(children[0].conclusion).toBe("x");
		expect(children[0].simulator).toBeUndefined();
		expect(children[1].simulator).toBeDefined();
	});
});

describe("mapChatBotData — root", () => {
	it("passes through greeting/question and reads the avatar url", () => {
		const root = makeNode({
			nodeTypes: ["sofnt:chatBot"],
			props: { avatarUrl: "/avatar.png" },
			children: [category({}, [leaf()])],
		});
		const data = run(root, "Bonjour", "Quel est votre projet ?");
		expect(data.greeting).toBe("Bonjour");
		expect(data.question).toBe("Quel est votre projet ?");
		expect(data.avatarUrl).toBe("/avatar.png");
		expect(data.categories).toHaveLength(1);
	});
});

// L'arbre est parcouru en `node.getNodes()` brut, ce qui court-circuite
// l'enregistrement par nœud de `#lib/jcr`. Une seule dépendance de sous-arbre,
// déclarée à la racine, doit couvrir toute la profondeur.
describe("mapChatBotData — cache dependency", () => {
	beforeEach(() => {
		vi.mocked(addSubtreeCacheDependency).mockClear();
	});

	it("declares a single subtree dependency on the chatBot root", () => {
		const root = chatBot([category({}, [leaf()])]);
		run(root);
		expect(addSubtreeCacheDependency).toHaveBeenCalledTimes(1);
		expect(addSubtreeCacheDependency).toHaveBeenCalledWith(root);
	});

	it("does not re-declare one per traversed category, however deep the tree", () => {
		const root = chatBot([
			category({ label: "L1" }, [category({ label: "L2" }, [category({ label: "L3" }, [leaf()])])]),
		]);
		run(root);
		expect(addSubtreeCacheDependency).toHaveBeenCalledTimes(1);
	});
});
