import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { CardArgumentProps } from "sofinco-react";
import { str } from "#lib/jcr";

export function mapCardArgumentProps(node: JCRNodeWrapper): CardArgumentProps {
	return {
		id: node.getIdentifier(),
		title: str(node, "jcr:title"),
		description: str(node, "description"),
	};
}
