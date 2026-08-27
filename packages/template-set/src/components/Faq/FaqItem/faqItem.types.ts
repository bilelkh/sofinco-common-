import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { FaqItem } from "sofinco-react";

export interface FaqItemServer extends FaqItem {
	node: JCRNodeWrapper;
}
