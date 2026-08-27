import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { GuideProps } from "sofinco-react";
import { extractGuideCategories } from "./GuideCategory/guideCategory.mapping";
import { str, getPropertyAsNode } from "#lib/jcr";

export type GuidePropsServer = Omit<GuideProps, "categories">;

function readTitleSize(node: JCRNodeWrapper): GuideProps["titleSize"] {
	const raw = str(node, "titleSize", "h2");
	return raw === "h3" ? "h3" : "h2";
}

function readCta(node: JCRNodeWrapper): { ctaLabel?: string; ctaUrl?: string } {
	const linkType = str(node, "linkType", "none");
	if (linkType === "none") return {};

	const label = str(node, "ctaLabel", "");
	if (!label) return {};

	const linkedNode = getPropertyAsNode(node, "j:linknode");
	const explicitUrl = str(node, "j:url", "");
	const href = linkedNode ? buildNodeUrl(linkedNode) : explicitUrl;
	if (!href) return {};

	return { ctaLabel: label, ctaUrl: href };
}

export function mapGuidePropsClient(node: JCRNodeWrapper): GuideProps {
	return {
		title: str(node, "jcr:title"),
		titleSize: readTitleSize(node),
		...readCta(node),
		categories: extractGuideCategories(node),
	};
}

export function mapGuidePropsServer(node: JCRNodeWrapper): GuidePropsServer {
	return {
		title: str(node, "jcr:title"),
		titleSize: readTitleSize(node),
		...readCta(node),
	};
}
