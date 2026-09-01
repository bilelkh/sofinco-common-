import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import {
	buildTitleProps,
	readItemsTitleLevel,
	readTitleLevel,
	readTitleStyle,
} from "./headingStyle.mapping";

describe("readTitleLevel", () => {
	it("reads titleLevel from the sofmix:headingStyle mixin", () => {
		const node = makeNode({ props: { titleLevel: "h3" } });
		expect(readTitleLevel(node)).toBe("h3");
	});

	it("accepts every allowed level (h1-h4)", () => {
		for (const level of ["h1", "h2", "h3", "h4"] as const) {
			const node = makeNode({ props: { titleLevel: level } });
			expect(readTitleLevel(node)).toBe(level);
		}
	});

	it("defaults to 'h2' when titleLevel is absent (matches CND autocreated)", () => {
		const node = makeNode({ props: {} });
		expect(readTitleLevel(node)).toBe("h2");
	});

	it("falls back to 'h2' for an out-of-range value (defensive)", () => {
		const node = makeNode({ props: { titleLevel: "h7" } });
		expect(readTitleLevel(node)).toBe("h2");
	});

	it("honors a custom fallback when the value is missing", () => {
		const node = makeNode({ props: {} });
		expect(readTitleLevel(node, "h1")).toBe("h1");
	});

	it("honors a custom fallback when the value is invalid", () => {
		const node = makeNode({ props: { titleLevel: "banana" } });
		expect(readTitleLevel(node, "h4")).toBe("h4");
	});
});

describe("readTitleStyle", () => {
	it("reads titleStyle from the sofmix:headingStyle mixin", () => {
		const node = makeNode({ props: { titleStyle: "h1" } });
		expect(readTitleStyle(node)).toBe("h1");
	});

	it("defaults to 'h2' when titleStyle is absent", () => {
		const node = makeNode({ props: {} });
		expect(readTitleStyle(node)).toBe("h2");
	});

	it("falls back to 'h2' for an invalid value", () => {
		const node = makeNode({ props: { titleStyle: "wat" } });
		expect(readTitleStyle(node)).toBe("h2");
	});

	it("honors a custom fallback when the value is missing", () => {
		const node = makeNode({ props: {} });
		expect(readTitleStyle(node, "h3")).toBe("h3");
	});

	it("is independent from titleLevel (SEO/visuel décorrélés)", () => {
		const node = makeNode({ props: { titleLevel: "h3", titleStyle: "h2" } });
		expect(readTitleLevel(node)).toBe("h3");
		expect(readTitleStyle(node)).toBe("h2");
	});
});

describe("buildTitleProps", () => {
	it("builds TitleProps from the heading mixin and the title text", () => {
		const node = makeNode({ props: { titleLevel: "h3", titleStyle: "h2" } });
		expect(buildTitleProps(node, "Mon titre")).toEqual({
			children: "Mon titre",
			as: "h3",
			visualStyle: "h2",
		});
	});

	it("defaults as/visualStyle to 'h2' when mixin fields are missing", () => {
		const node = makeNode({ props: {} });
		expect(buildTitleProps(node, "Mon titre")).toEqual({
			children: "Mon titre",
			as: "h2",
			visualStyle: "h2",
		});
	});

	it("returns undefined for an empty title (React omits the empty header)", () => {
		const node = makeNode({ props: { titleLevel: "h3" } });
		expect(buildTitleProps(node, "")).toBeUndefined();
	});

	it("applies a custom fallback to both fields when JCR values are missing", () => {
		const node = makeNode({ props: {} });
		expect(buildTitleProps(node, "T", "h1")).toEqual({
			children: "T",
			as: "h1",
			visualStyle: "h1",
		});
	});

	/*
	 * LE REPLI D'APPARENCE NE PEUT PAS ETRE LA BALISE.
	 *
	 * `fallback` porte une BALISE, qui vaut parfois `p`, `h5` ou `h6` — trois valeurs qui ne
	 * designent aucune echelle typographique du design system (`Title.module.css` s'arrete a
	 * h4). Les propager en `visualStyle` produirait une classe `title--p` inexistante, donc un
	 * titre rendu SANS aucune typographie. On retombe sur `h2`, qui existe.
	 */
	it.each(["p", "h5", "h6"])(
		"n'utilise pas un repli %o comme apparence — il ne designe aucune echelle",
		(tag) => {
			const node = makeNode({ props: {} });
			expect(buildTitleProps(node, "T", tag as "p")).toEqual({
				children: "T",
				as: tag,
				visualStyle: "h2",
			});
		},
	);

	it("sanitizes invalid mixin values defensively (defaults to h2)", () => {
		const node = makeNode({ props: { titleLevel: "h9", titleStyle: "big" } });
		expect(buildTitleProps(node, "T")).toEqual({
			children: "T",
			as: "h2",
			visualStyle: "h2",
		});
	});
});

describe("readItemsTitleLevel", () => {
	const bloc = (props: Record<string, string> = {}) =>
		makeNode({ nodeTypes: ["sofnt:reassurance"], props });

	/*
	 * LE CONTRAT : le niveau se lit sur le CONTENEUR, jamais sur l'item.
	 *
	 * Des items freres sont des pairs dans le plan de la page. Laisser chacun choisir son
	 * niveau permettrait un item 1 en h3 et un item 2 en h5, ce qui affirme que le second
	 * est une sous-section du premier — une hierarchie fausse, invisible a l'ecran.
	 */
	it("lit `itemsTitleLevel` sur le conteneur", () => {
		const item = makeNode({ parent: bloc({ itemsTitleLevel: "h4" }) });
		expect(readItemsTitleLevel(item, "sofnt:reassurance", "h3")).toBe("h4");
	});

	it("traverse les niveaux intermediaires jusqu'au conteneur", () => {
		// `sofnt:productAdvantageCategory` vit sous un wrapper `…CategoryList` : la remontee
		// doit franchir ce niveau, sinon le niveau contribue ne serait jamais lu.
		const conteneur = makeNode({
			nodeTypes: ["sofnt:productAdvantages"],
			props: { itemsTitleLevel: "h5" },
		});
		const wrapper = makeNode({
			nodeTypes: ["sofnt:productAdvantageCategoryList"],
			parent: conteneur,
		});
		const item = makeNode({ parent: wrapper });

		expect(readItemsTitleLevel(item, "sofnt:productAdvantages", "h3")).toBe("h5");
	});

	it("retombe sur le repli quand le conteneur ne choisit rien", () => {
		const item = makeNode({ parent: bloc() });
		expect(readItemsTitleLevel(item, "sofnt:reassurance", "h3")).toBe("h3");
	});

	/*
	 * Vue d'edition d'un item isole, contenu orphelin, corbeille : la remontee peut ne
	 * trouver aucun conteneur. Le rendu doit rester celui d'origine, pas une exception.
	 */
	it("retombe sur le repli quand aucun conteneur n'est atteignable", () => {
		expect(readItemsTitleLevel(makeNode({}), "sofnt:reassurance", "h3")).toBe("h3");
	});

	/*
	 * Un `itemsTitleLevel` pose sur l'ITEM ne doit RIEN faire : reliquat possible d'un
	 * contenu migre depuis la version ou la propriete vivait la. Le laisser agir
	 * reintroduirait l'incoherence que le deplacement supprime.
	 */
	it("ignore la propriete si elle traine sur l'item lui-meme", () => {
		const item = makeNode({
			props: { itemsTitleLevel: "h6" },
			parent: bloc({ itemsTitleLevel: "h4" }),
		});
		expect(readItemsTitleLevel(item, "sofnt:reassurance", "h4")).toBe("h4");
	});

	it("assainit une valeur hors choicelist", () => {
		const item = makeNode({ parent: bloc({ itemsTitleLevel: "h9" }) });
		expect(readItemsTitleLevel(item, "sofnt:reassurance", "h3")).toBe("h3");
	});

	it("accepte 'p' — « ce texte n'est pas un titre »", () => {
		const item = makeNode({ parent: bloc({ itemsTitleLevel: "p" }) });
		expect(readItemsTitleLevel(item, "sofnt:reassurance", "h3")).toBe("p");
	});
});
