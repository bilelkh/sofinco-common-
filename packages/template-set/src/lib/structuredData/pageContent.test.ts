import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeNode } from "#test/jahia";
import type { JCRNodeWrapper } from "org.jahia.services.content";

vi.mock("#lib/jcr", () => import("#test/jahia"));

const jcrQuery = vi.fn<(sql: string) => JCRNodeWrapper[]>(() => []);
vi.mock("#lib/jcrQuery", () => ({ jcrQuery: (sql: string) => jcrQuery(sql) }));

const addSubtreeCacheDependency = vi.fn();
vi.mock("#lib/cacheDependency", () => ({
	addSubtreeCacheDependency: (node: JCRNodeWrapper) => addSubtreeCacheDependency(node),
}));

import { findPageContent } from "./pageContent";

const page = (path: string) => makeNode({ nodeTypes: ["jnt:page"], path });

/** Bloc de contenu rattaché à `owner` par la chaîne de parents. */
const block = (owner: JCRNodeWrapper, type: string) =>
	makeNode({
		nodeTypes: [type],
		parent: makeNode({ nodeTypes: ["jnt:contentList"], parent: owner }),
	});

beforeEach(() => {
	jcrQuery.mockReset();
	jcrQuery.mockReturnValue([]);
	addSubtreeCacheDependency.mockReset();
});

describe("findPageContent", () => {
	it("interroge le sous-arbre de la page pour le type demandé", () => {
		findPageContent(page("/sites/sofinco/credit-auto"), "sofnt:faq");
		expect(jcrQuery).toHaveBeenCalledWith(
			"SELECT * FROM [sofnt:faq] WHERE ISDESCENDANTNODE('/sites/sofinco/credit-auto')",
		);
	});

	it("double les quotes simples du chemin dans le littéral SQL", () => {
		findPageContent(page("/sites/sofinco/l'offre"), "sofnt:faq");
		expect(jcrQuery).toHaveBeenCalledWith(
			"SELECT * FROM [sofnt:faq] WHERE ISDESCENDANTNODE('/sites/sofinco/l''offre')",
		);
	});

	it("écarte les blocs appartenant à une sous-page", () => {
		const current = page("/sites/sofinco/credit-auto");
		const child = makeNode({ nodeTypes: ["jnt:page"], path: "/sites/sofinco/credit-auto/faq" });
		const mine = block(current, "sofnt:faq");
		jcrQuery.mockReturnValue([mine, block(child, "sofnt:faq")]);

		expect(findPageContent(current, "sofnt:faq")).toEqual([mine]);
	});

	it("écarte un nœud sans page ancêtre", () => {
		const current = page("/sites/sofinco/credit-auto");
		jcrQuery.mockReturnValue([makeNode({ nodeTypes: ["sofnt:faq"] })]);
		expect(findPageContent(current, "sofnt:faq")).toEqual([]);
	});

	it("déclare la dépendance de cache sur le sous-arbre de la page", () => {
		const current = page("/sites/sofinco/credit-auto");
		findPageContent(current, "sofnt:videoBlock");
		expect(addSubtreeCacheDependency).toHaveBeenCalledWith(current);
	});

	it("ne requête pas quand la page est absente ou sans chemin", () => {
		expect(findPageContent(null, "sofnt:faq")).toEqual([]);
		expect(findPageContent(page(""), "sofnt:faq")).toEqual([]);
		expect(jcrQuery).not.toHaveBeenCalled();
	});
});
