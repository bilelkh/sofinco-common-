import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("@jahia/javascript-modules-library", () => ({ useServerContext: vi.fn() }));

import { useServerContext } from "@jahia/javascript-modules-library";
import type { JCRSessionWrapper } from "org.jahia.services.content";
import { jcrQuery } from "./jcrQuery";

function makeSession(nodes = [makeNode({ id: "1" }), makeNode({ id: "2" })], throws = false) {
	const setLimit = vi.fn();
	const createQuery = vi.fn(() => {
		let i = 0;
		return {
			setLimit,
			execute: () => ({
				getNodes: () => ({ hasNext: () => i < nodes.length, nextNode: () => nodes[i++] }),
			}),
		};
	});
	const session = {
		getWorkspace: () => {
			if (throws) throw new Error("no workspace");
			return { getQueryManager: () => ({ createQuery }) };
		},
	} as unknown as JCRSessionWrapper;
	return { session, setLimit, createQuery };
}

describe("jcrQuery", () => {
	it("runs the query against the provided session and collects nodes", () => {
		const { session, createQuery, setLimit } = makeSession();
		const result = jcrQuery("SELECT * FROM [spnt:news]", { session, limit: 3 });
		expect(result).toHaveLength(2);
		expect(createQuery).toHaveBeenCalledWith("SELECT * FROM [spnt:news]", "JCR-SQL2");
		expect(setLimit).toHaveBeenCalledWith(3);
	});

	it("does not set a limit when none is given", () => {
		const { session, setLimit } = makeSession();
		jcrQuery("SELECT * FROM [x]", { session });
		expect(setLimit).not.toHaveBeenCalled();
	});

	it("defaults to the current node's session from the server context", () => {
		const { session, createQuery } = makeSession();
		vi.mocked(useServerContext).mockReturnValue({
			currentNode: { getSession: () => session },
		} as unknown as ReturnType<typeof useServerContext>);
		expect(jcrQuery("SELECT * FROM [x]")).toHaveLength(2);
		expect(createQuery).toHaveBeenCalled();
	});

	it("returns [] when the query throws", () => {
		const { session } = makeSession([], true);
		expect(jcrQuery("BAD SQL", { session })).toEqual([]);
	});
});
