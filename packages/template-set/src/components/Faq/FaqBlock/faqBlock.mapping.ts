import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { FaqProps, FaqIntegration, LinkProps } from "sofinco-react";
import type { FaqBlockPropsServer } from "./faqBlock.types";
import { extractFaqItems, extractFaqItemsServer } from "../FaqItem/faqItem.mapping";
import { str, strList, imgUrl, hasMixin, getAsBoolean } from "#lib/jcr";
import { readTitleLevel, readTitleStyle } from "../../Shared/HeadingStyle/headingStyle.mapping";
import { readLinkChild } from "#shared/Link/readLink";

/**
 * Resolves the optional `link` child (sofnt:link) into the DS `LinkProps`
 * rendered centered at the bottom of the FAQ. Returns `undefined` when the
 * child is absent or the link is disabled/unresolvable.
 */
function mapFaqLink(node: JCRNodeWrapper): LinkProps | undefined {
	const link = readLinkChild(node, "link");
	if (!link) return undefined;
	return {
		href: link.href,
		label: link.label,
		isExternal: link.target === "_blank",
		iconLeft: link.iconLeft,
		iconRight: link.iconRight,
		iconVariant: link.iconVariant,
	};
}

/** Reads the `sofmix:faqIntegration` fields into the Smart Tribune widget config. */
function mapFaqIntegration(node: JCRNodeWrapper): FaqIntegration {
	return {
		jsUrl: str(node, "jsUrl"),
		kbId: str(node, "kbId"),
		thematicsFilter: str(node, "thematicsFilter"),
		// Multi-valued in the CND — flatten to the comma-separated string the
		// React widget config expects.
		tagsFilter: strList(node, "tagsFilter").join(","),
		tagsOr: getAsBoolean(node, "tagsOr"),
		cookieOptin: getAsBoolean(node, "cookieOptin"),
		searchFiltered: getAsBoolean(node, "searchFiltered"),
		headerId: str(node, "headerId"),
		// Multi-valued `key:value` entries — kept as a list and parsed in React.
		extraParams: strList(node, "extraParams"),
	};
}

/**
 * Shared block fields common to the client and server mappers — everything except the
 * `items` list (which differs in shape: plain DTOs vs node-bearing editable items).
 * External source (sofmix:faqIntegration) renders Smart Tribune from its config; manual
 * items (sofmix:faqItems) carry the editable children.
 */
function mapFaqBlockBase(node: JCRNodeWrapper): Omit<FaqProps, "items"> {
	const useExternalSource = hasMixin(node, "sofmix:faqIntegration");
	return {
		title: str(node, "jcr:title"),
		subtitle: str(node, "subtitle"),
		imageUrl: imgUrl(node, "image"),
		imageAlt: str(node, "imageAlt"),
		// Heading level (semantic HTML tag) and style (visual appearance) come from
		// the sofmix:headingStyle mixin, defaulting to "h2" — matches its autocreated
		// values. `titleStyle` lets a contributor restyle the title independently of
		// the semantic level.
		titleAs: readTitleLevel(node, "h4"),
		titleStyle: readTitleStyle(node, "h2"),
		useExternalSource,
		integration: useExternalSource ? mapFaqIntegration(node) : undefined,
	};
}

export function mapFaqBlockPropsClient(node: JCRNodeWrapper): FaqProps {
	const base = mapFaqBlockBase(node);
	return {
		...base,
		items: base.useExternalSource ? [] : extractFaqItems(node),
		link: mapFaqLink(node),
	};
}

export function mapFaqBlockPropsServer(node: JCRNodeWrapper): FaqBlockPropsServer {
	const base = mapFaqBlockBase(node);
	return { ...base, items: base.useExternalSource ? [] : extractFaqItemsServer(node) };
}
