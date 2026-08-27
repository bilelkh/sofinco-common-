import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { FooterLinkProps } from "sofinco-react";
import { str } from "#lib/jcr";
import { getCtaPropsWithMode } from "#lib/cta";

const getParentTitle = (node: JCRNodeWrapper): string => {
	try {
		const parent = node.getParent() as JCRNodeWrapper;
		return parent ? str(parent, "jcr:title") : "";
	} catch {
		return "";
	}
};

export function mapFooterLinkPropsClient(node: JCRNodeWrapper): FooterLinkProps {
	const { props, mode } = getCtaPropsWithMode(node, "footer-link");

	const link = props as FooterLinkProps;
	link.tracking = {
		event: "click_menu_footer",
		menu_level_1: getParentTitle(node),
		menu_level_2: link.label,
		menu_level_3: "",
	};

	if (mode === "consent") {
		link.isConsent = true;
	}
	return link;
}
