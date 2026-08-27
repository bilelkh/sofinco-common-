import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { FaqItem } from "sofinco-react";
import type { FaqItemServer } from "./faqItem.types";
import { str, getChildNodesByType } from "#lib/jcr";

export function mapFaqItemClient(node: JCRNodeWrapper): FaqItem {
	return {
		id: node.getIdentifier(),
		question: str(node, "jcr:title"),
		answer: str(node, "answer"),
	};
}

export function mapFaqItemServer(node: JCRNodeWrapper): FaqItemServer {
	return {
		...mapFaqItemClient(node),
		node,
	};
}

export function extractFaqItems(parent: JCRNodeWrapper): FaqItem[] {
	return getChildNodesByType(parent, "sofnt:faqItem").map(mapFaqItemClient);
}

export function extractFaqItemsServer(parent: JCRNodeWrapper): FaqItemServer[] {
	return getChildNodesByType(parent, "sofnt:faqItem").map(mapFaqItemServer);
}
