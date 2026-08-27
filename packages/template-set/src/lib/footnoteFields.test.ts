import { describe, it, expect } from "vitest";
import { makeNode } from "#test/jahia";
import { FOOTNOTE_FIELDS, shouldProcessFootnotes } from "./footnoteFields";

describe("shouldProcessFootnotes", () => {
	it("is true for a registered (nodeType, property) pair", () => {
		const node = makeNode({ nodeTypes: ["sofnt:footer"] });
		expect(shouldProcessFootnotes(node, "legalMention")).toBe(true);
	});

	it("is false for an unregistered property name (cheap pre-check)", () => {
		const node = makeNode({ nodeTypes: ["sofnt:footer"] });
		expect(shouldProcessFootnotes(node, "subtitle")).toBe(false);
	});

	it("is false when the property is registered but the node type does not match", () => {
		const node = makeNode({ nodeTypes: ["sofnt:somethingElse"] });
		expect(shouldProcessFootnotes(node, "legalMention")).toBe(false);
	});

	it("is true for sofnt:productHero characteristics (offer-card footnotes)", () => {
		const node = makeNode({ nodeTypes: ["sofnt:productHero"] });
		expect(shouldProcessFootnotes(node, "characteristics")).toBe(true);
	});

	it("is true for sofnt:productHero description (hero wysiwyg footnotes)", () => {
		// Le champ est passé en richtext (barre `Description`) pour que le
		// contributeur y saisisse ses exposants ⁽¹⁾ : sans cette entrée, le bouton
		// d'ancres poserait un marqueur que le rendu ignorerait en silence.
		const node = makeNode({ nodeTypes: ["sofnt:productHero"] });
		expect(shouldProcessFootnotes(node, "description")).toBe(true);
	});

	it("is false for description on another node type (property name alone is not enough)", () => {
		// `description` est un nom de propriété TRÈS répandu dans les CND ; la
		// pré-vérification bon marché de `shouldProcessFootnotes` ne doit pas faire
		// entrer tous ces champs dans la réécriture.
		const node = makeNode({ nodeTypes: ["sofnt:seoBlock"] });
		expect(shouldProcessFootnotes(node, "description")).toBe(false);
	});

	it("exposes the registry", () => {
		expect(FOOTNOTE_FIELDS["sofnt:footer"]).toContain("legalMention");
		expect(FOOTNOTE_FIELDS["sofnt:productHero"]).toEqual(
			expect.arrayContaining(["characteristics", "description"]),
		);
	});
});
