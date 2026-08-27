import { useServerContext } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper, JCRSessionWrapper } from "org.jahia.services.content";

/**
 * Executes a JCR-SQL2 query and returns the matching nodes.
 *
 * @param sql         JCR-SQL2 query string (e.g. `SELECT * FROM [spnt:news] WHERE ...`).
 * @param options.limit   Optional max number of nodes to return.
 * @param options.session Optional JCR session. Defaults to the current node's session
 *                        resolved from `useServerContext()`.
 */
export function jcrQuery(
	sql: string,
	options: { limit?: number; session?: JCRSessionWrapper } = {},
): JCRNodeWrapper[] {
	const session = options.session ?? useServerContext().currentNode.getSession();
	try {
		const query = session.getWorkspace().getQueryManager().createQuery(sql, "JCR-SQL2");
		if (typeof options.limit === "number") {
			query.setLimit(options.limit);
		}
		const iterator = query.execute().getNodes();
		const result: JCRNodeWrapper[] = [];
		while (iterator.hasNext()) {
			result.push(iterator.nextNode() as JCRNodeWrapper);
		}
		return result;
	} catch {
		return [];
	}
}
