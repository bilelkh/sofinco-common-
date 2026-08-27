import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";
import type { TFunction } from "#lib/i18n";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import { mapReassurancePictosProps } from "./reassurancePictos.mapping";

// `t` factice — renvoie la clé telle quelle, suffit pour asserter le passage.
const t: TFunction = (key: string) => key;

const makePicto = (id: string, label: string, iconUrl: string) =>
	makeNode({
		id,
		nodeTypes: ["sofnt:reassurancePictosItem"],
		props: {
			"jcr:title": label,
			icon: iconUrl,
		},
	});

const buildParent = (opts: {
	maxItems?: number;
	pictos?: ReturnType<typeof makePicto>[];
} = {}) =>
	makeNode({
		nodeTypes: ["sofnt:reassurancePictos"],
		props: opts.maxItems !== undefined ? { maxItems: opts.maxItems } : {},
		children: opts.pictos ?? [
			makePicto("id-1", "Depuis 75 ans à vos côtés", "/icon-1.webp"),
			makePicto("id-2", "Parcours 100% sécurisé", "/icon-2.webp"),
			makePicto("id-3", "Simulation sans engagement", "/icon-3.webp"),
			makePicto("id-4", "Signature électronique", "/icon-4.webp"),
		],
	});

describe("mapReassurancePictosProps → ReassurancePictosProps", () => {
	it("lit tous les enfants sofnt:reassurancePictosItem dans l'ordre JCR", () => {
		const result = mapReassurancePictosProps(buildParent(), t);
		expect(result.items).toHaveLength(4);
		expect(result.items[0]).toEqual({
			id: "id-1",
			src: "/icon-1.webp",
			label: "Depuis 75 ans à vos côtés",
		});
		expect(result.items.map((i) => i.label)).toEqual([
			"Depuis 75 ans à vos côtés",
			"Parcours 100% sécurisé",
			"Simulation sans engagement",
			"Signature électronique",
		]);
	});

	it("`id` provient de node.getIdentifier() (stable pour key React)", () => {
		const result = mapReassurancePictosProps(buildParent(), t);
		expect(result.items.map((i) => i.id)).toEqual(["id-1", "id-2", "id-3", "id-4"]);
	});

	it("tronque à `maxItems` (cap éditorial appliqué au mapping)", () => {
		// 6 items contribués + maxItems=4 → mapping renvoie exactement 4.
		const sixPictos = Array.from({ length: 6 }, (_, i) =>
			makePicto(`id-${i}`, `Picto ${i}`, `/icon-${i}.webp`),
		);
		const result = mapReassurancePictosProps(buildParent({ maxItems: 4, pictos: sixPictos }), t);
		expect(result.items).toHaveLength(4);
		expect(result.items.map((i) => i.id)).toEqual(["id-0", "id-1", "id-2", "id-3"]);
	});

	it("respecte un `maxItems` différent de la valeur par défaut", () => {
		const sixPictos = Array.from({ length: 6 }, (_, i) =>
			makePicto(`id-${i}`, `Picto ${i}`, `/icon-${i}.webp`),
		);
		expect(mapReassurancePictosProps(buildParent({ maxItems: 2, pictos: sixPictos }), t).items).toHaveLength(2);
		expect(mapReassurancePictosProps(buildParent({ maxItems: 6, pictos: sixPictos }), t).items).toHaveLength(6);
	});

	it("liste vide quand aucun enfant sofnt:reassurancePictosItem contribué", () => {
		const parent = makeNode({
			nodeTypes: ["sofnt:reassurancePictos"],
			children: [],
		});
		expect(mapReassurancePictosProps(parent, t).items).toEqual([]);
	});

	it("garde tous les items quand items.length < maxItems (pas de padding)", () => {
		const twoPictos = [
			makePicto("id-1", "A", "/a.webp"),
			makePicto("id-2", "B", "/b.webp"),
		];
		const result = mapReassurancePictosProps(buildParent({ maxItems: 4, pictos: twoPictos }), t);
		expect(result.items).toHaveLength(2);
	});

	it("`maxItems` absent → défaut 4", () => {
		const sixPictos = Array.from({ length: 6 }, (_, i) =>
			makePicto(`id-${i}`, `Picto ${i}`, `/icon-${i}.webp`),
		);
		// Pas de maxItems dans les props → num() retombe sur le défaut 4
		const result = mapReassurancePictosProps(buildParent({ pictos: sixPictos }), t);
		expect(result.items).toHaveLength(4);
	});

	it("`maxItems = 0` → fallback DEFAULT_MAX_ITEMS (défensif : 0 items = composant invisible)", () => {
		// Scénario : contribution malintentionnée via Groovy/API contournant la
		// contrainte CND `[1,20]`. Le guard `> 0` du mapping doit ramener à 4.
		const sixPictos = Array.from({ length: 6 }, (_, i) =>
			makePicto(`id-${i}`, `Picto ${i}`, `/icon-${i}.webp`),
		);
		const result = mapReassurancePictosProps(buildParent({ maxItems: 0, pictos: sixPictos }), t);
		expect(result.items).toHaveLength(4);
	});

	it("`maxItems` négatif → fallback DEFAULT_MAX_ITEMS (défensif)", () => {
		// Même garde-fou que le test précédent, sur la borne négative.
		const sixPictos = Array.from({ length: 6 }, (_, i) =>
			makePicto(`id-${i}`, `Picto ${i}`, `/icon-${i}.webp`),
		);
		const result = mapReassurancePictosProps(buildParent({ maxItems: -5, pictos: sixPictos }), t);
		expect(result.items).toHaveLength(4);
	});

	it("`src` vide quand `icon` non contribué (item en cours d'édition)", () => {
		const emptyIcon = makePicto("id-x", "Libellé sans icône", "");
		const result = mapReassurancePictosProps(buildParent({ pictos: [emptyIcon] }), t);
		expect(result.items[0].src).toBe("");
		expect(result.items[0].label).toBe("Libellé sans icône");
	});

	it("`label` vide quand `jcr:title` non contribué (picto sans texte)", () => {
		const noLabel = makePicto("id-x", "", "/icon.webp");
		const result = mapReassurancePictosProps(buildParent({ pictos: [noLabel] }), t);
		expect(result.items[0]).toEqual({ id: "id-x", src: "/icon.webp", label: "" });
	});

	it("ignore les enfants d'un autre nodeType (défensif)", () => {
		const other = makeNode({ nodeTypes: ["sofnt:reassuranceItem"], props: {} });
		const parent = makeNode({
			nodeTypes: ["sofnt:reassurancePictos"],
			children: [
				makePicto("id-1", "OK", "/a.webp"),
				other,
				makePicto("id-2", "OK", "/b.webp"),
			],
		});
		const result = mapReassurancePictosProps(parent, t);
		expect(result.items).toHaveLength(2);
		expect(result.items.map((i) => i.id)).toEqual(["id-1", "id-2"]);
	});

	it("le contrat DS ne comporte PLUS maxItems (cap invisible du DS)", () => {
		// Garde-fou : si un futur refactor réintroduit maxItems côté DS,
		// ce test signale la régression architecturale.
		const result = mapReassurancePictosProps(buildParent(), t);
		expect((result as { maxItems?: unknown }).maxItems).toBeUndefined();
	});

	// ── ariaLabel (WCAG landmark) — cascade contrib > fallback i18n ────────────

	it("`ariaLabel` contribué dans le CND prime sur le fallback i18n", () => {
		const parent = makeNode({
			nodeTypes: ["sofnt:reassurancePictos"],
			props: { ariaLabel: "Nos garanties" },
			children: [makePicto("id-1", "OK", "/a.webp")],
		});
		expect(mapReassurancePictosProps(parent, t).ariaLabel).toBe("Nos garanties");
	});

	it("`ariaLabel` fallback vers la clé i18n quand le champ JCR est vide (contribution effacée)", () => {
		const parent = makeNode({
			nodeTypes: ["sofnt:reassurancePictos"],
			props: { ariaLabel: "" },
			children: [makePicto("id-1", "OK", "/a.webp")],
		});
		// `t` factice renvoie la clé — vérifie que le fallback se déclenche.
		expect(mapReassurancePictosProps(parent, t).ariaLabel).toBe("reassurancePictos.sectionLabel");
	});

	it("`ariaLabel` fallback vers la clé i18n quand le champ JCR n'existe pas (nodes legacy)", () => {
		// Node créé AVANT l'ajout du champ CND — pas de propriété ariaLabel du tout.
		// Le mapping doit continuer à fonctionner via le fallback.
		const result = mapReassurancePictosProps(buildParent(), t);
		expect(result.ariaLabel).toBe("reassurancePictos.sectionLabel");
	});

	it("`ariaLabel` whitespace uniquement → trim + fallback i18n (défensif a11y)", () => {
		// Un contributeur qui frappe " " (espace seul) NE DOIT PAS créer un
		// landmark nommé par du whitespace (techniquement valide HTML mais
		// invisible aux lecteurs d'écran).
		const parent = makeNode({
			nodeTypes: ["sofnt:reassurancePictos"],
			props: { ariaLabel: "   " },
			children: [makePicto("id-1", "OK", "/a.webp")],
		});
		expect(mapReassurancePictosProps(parent, t).ariaLabel).toBe("reassurancePictos.sectionLabel");
	});
});
