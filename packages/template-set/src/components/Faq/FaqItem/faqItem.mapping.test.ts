import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import {
	mapFaqItemClient,
	mapFaqItemServer,
	extractFaqItems,
	extractFaqItemsServer,
} from "./faqItem.mapping";

describe("mapFaqItemClient", () => {
	it("maps id, question and answer", () => {
		const node = makeNode({ id: "q1", props: { "jcr:title": "Question ?", "answer": "Réponse" } });
		expect(mapFaqItemClient(node)).toEqual({ id: "q1", question: "Question ?", answer: "Réponse" });
	});
});

describe("mapFaqItemServer", () => {
	it("keeps the underlying node alongside the client shape", () => {
		const node = makeNode({ id: "q1", props: { "jcr:title": "Q", "answer": "A" } });
		const result = mapFaqItemServer(node);
		expect(result).toMatchObject({ id: "q1", question: "Q", answer: "A" });
		expect(result.node).toBe(node);
	});
});

describe("extractFaqItems", () => {
	it("maps only sofnt:faqItem children", () => {
		const i1 = makeNode({
			id: "1",
			nodeTypes: ["sofnt:faqItem"],
			props: { "jcr:title": "Q1", "answer": "A1" },
		});
		const other = makeNode({ id: "x", nodeTypes: ["sofnt:other"] });
		const node = makeNode({ children: [i1, other] });

		expect(extractFaqItems(node)).toEqual([{ id: "1", question: "Q1", answer: "A1" }]);
		expect(extractFaqItemsServer(node)).toHaveLength(1);
	});
});
