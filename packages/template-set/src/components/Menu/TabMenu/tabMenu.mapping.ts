import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { TopBarTab } from "sofinco-react";
import { getChildNodesByType, getPropertyAsNode, str } from "#lib/jcr";

/**
 * Maps a `sofnt:tabMenu` node's `sofnt:menuLink` children to `TopBar` tabs.
 * Capped at 2 by convention (Particuliers / Professionnels).
 */
export function mapTopBarTabs(tabMenuNode: JCRNodeWrapper): TopBarTab[] {
	return getChildNodesByType(tabMenuNode, "sofnt:menuLink")
		.slice(0, 2)
		.map((n): TopBarTab => {
			const linkedNode = getPropertyAsNode(n, "j:linknode");
			const url = str(n, "j:url", "");
			const title = str(n, "jcr:title", "");
			const linkTitle = str(n, "j:linkTitle", "");
			const target = str(n, "j:target", "");
			return {
				href: linkedNode ? buildNodeUrl(linkedNode) : url || "#",
				label: title,
				target: target || undefined,
				ariaLabel: linkTitle || title,
				tracking: { event: "click_tab", menu_level_1: title },
			};
		});
}
