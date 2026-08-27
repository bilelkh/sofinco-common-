import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("#lib/cta", () => ({ getCtaProps: vi.fn(() => ({ label: "CTA" })) }));

import { mapOfferSlideColoredProps } from "./offerSlideColored.mapping";

/** Choicelist `backgroundColor` de definition.cnd — à tenir à jour avec le CND. */
const COLORS = ["#FDF0FE", "#B4F7F4", "#FAE8ED"];

describe("mapOfferSlideColoredProps", () => {
	it("maps a colored slide", () => {
		const node = makeNode({
			id: "s1",
			props: {
				"jcr:title": "Titre",
				"description": "Desc",
				"eyebrow": "Eyebrow",
				"backgroundColor": "#FDF0FE",
				"illustration": "img.png",
			},
		});
		expect(mapOfferSlideColoredProps(node)).toEqual({
			variant: "colored",
			id: "s1",
			title: "Titre",
			description: "Desc",
			eyebrow: "Eyebrow",
			backgroundColor: "#FDF0FE",
			img: "img.png",
			cta: { label: "CTA" },
		});
	});

	it("omits the eyebrow when empty", () => {
		expect(mapOfferSlideColoredProps(makeNode({ id: "s" })).eyebrow).toBeUndefined();
	});

	// Le mapper passe l'hexadécimal tel quel au composant React, qui l'écrit dans un
	// `style`. Toute normalisation (minuscules, `#` retiré, trim) casserait le rendu, d'où
	// l'égalité stricte sur chaque valeur autorisée.
	it.each(COLORS)("passes the color %s through untouched", (color) => {
		const node = makeNode({ id: "s", props: { backgroundColor: color } });
		expect(mapOfferSlideColoredProps(node).backgroundColor).toBe(color);
	});

	it("falls back to an empty color when the property is absent", () => {
		// `str()` renvoie "" hors CND : un contenu créé avant l'ajout du champ ne doit pas
		// produire `undefined`, que le composant écrirait tel quel dans le style inline.
		expect(mapOfferSlideColoredProps(makeNode({ id: "s" })).backgroundColor).toBe("");
	});
});
