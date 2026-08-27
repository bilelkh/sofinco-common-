/*
 * Registre des renvois et des mentions — ENREGISTREMENT seul.
 *
 * L'analyse et l'affichage sont testés dans `src/audit/`, qui importe ce registre. La
 * séparation des tests suit celle du code : `lib` enregistre, `audit` interprète.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
	collectFootnoteNote,
	collectFootnoteReference,
	isCollectingFootnotes,
	readFootnoteCollection,
	setFootnoteLocation,
	startFootnoteCollection,
} from "./footnoteCollector";

afterEach(() => startFootnoteCollection(false));

describe("collecte", () => {
	it("est entièrement inerte hors mode édition — coût nul en production", () => {
		startFootnoteCollection(false);
		expect(isCollectingFootnotes()).toBe(false);

		collectFootnoteReference("1");
		collectFootnoteNote("1", "sofnt:mentionLegalItem");

		expect(readFootnoteCollection()).toEqual({ references: [], notes: [] });
	});

	it("liste CHAQUE endroit où une même clé est écrite", () => {
		/*
		 * Un même `((50))` erroné peut être écrit dans cinq composants. N'en montrer qu'un
		 * obligerait le contributeur à chercher les autres à l'aveugle et à corriger en
		 * plusieurs passes. L'unité de correction est le CHAMP, pas la mention.
		 */
		startFootnoteCollection(true);

		setFootnoteLocation({ id: "a", path: "/a", property: "subtitle", label: "Hero — subtitle" });
		collectFootnoteReference("50");
		setFootnoteLocation({ id: "b", path: "/b", property: "content", label: "Bloc SEO — content" });
		collectFootnoteReference("50");

		expect(readFootnoteCollection().references.map((r) => r.location?.label)).toEqual([
			"Hero — subtitle",
			"Bloc SEO — content",
		]);
	});

	it("liste CHAQUE CHAMP d'un même composant, pas une ligne pour le composant", () => {
		/*
		 * Un composant peut porter la même erreur dans son titre, son sous-titre, sa
		 * description et son richtext. Dédupliquer sur le seul nœud les fondait en une ligne :
		 * le contributeur en corrigeait un et croyait avoir terminé.
		 */
		startFootnoteCollection(true);

		for (const property of ["jcr:title", "subtitle", "description", "content"]) {
			setFootnoteLocation({ id: "hero", path: "/hero", property, label: `Hero — ${property}` });
			collectFootnoteReference("50");
		}

		expect(readFootnoteCollection().references.map((r) => r.location?.property)).toEqual([
			"jcr:title",
			"subtitle",
			"description",
			"content",
		]);
	});

	it("ne répète pas deux occurrences d'un même champ — elles se corrigent d'un geste", () => {
		startFootnoteCollection(true);
		setFootnoteLocation({ id: "a", path: "/a", property: "subtitle", label: "Hero — subtitle" });
		collectFootnoteReference("1");
		collectFootnoteReference("1");

		expect(readFootnoteCollection().references).toHaveLength(1);
	});

	it("réarme à chaque rendu de page", () => {
		startFootnoteCollection(true);
		collectFootnoteReference("1");
		startFootnoteCollection(true);

		expect(readFootnoteCollection().references).toEqual([]);
	});
});
