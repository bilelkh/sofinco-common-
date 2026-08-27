import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { IconKey } from "sofinco-react";
import { getChildNode, getChildNodesByType, getPropertyAsNode, str } from "#lib/jcr";

export type IconVariant = "primary" | "accent" | "danger";
export type LinkTarget = "_self" | "_blank";

/**
 * Raw JCR property shape of a `sofnt:link` (+ `sofmix:link`) node, as
 * received by a `jahiaComponent` handler. The values are the unprocessed
 * Jahia properties — use {@link readLink} to resolve them into renderable
 * {@link LinkData}.
 */
export interface LinkProps {
	"jcr:title": string;
	"j:linknode": JCRNodeWrapper;
	"j:url": string;
	"j:linkTitle": string;
	"j:target": LinkTarget;
	"iconLeft"?: IconKey;
	"iconRight"?: IconKey;
	"iconVariant": IconVariant;
}

export interface LinkData {
	href: string;
	label: string;
	target: LinkTarget;
	iconLeft?: IconKey;
	iconRight?: IconKey;
	iconVariant: IconVariant;
}

const ICON_VARIANTS: IconVariant[] = ["primary", "accent", "danger"];

function readIcon(node: JCRNodeWrapper, propertyName: string): IconKey | undefined {
	const value = str(node, propertyName, "");
	return value ? (value as IconKey) : undefined;
}

function readIconVariant(node: JCRNodeWrapper): IconVariant {
	const value = str(node, "iconVariant", "primary");
	return (ICON_VARIANTS as string[]).includes(value) ? (value as IconVariant) : "primary";
}

/**
 * Reads a `sofnt:link` node (optionally mixed with `sofmix:link` for icons)
 * and resolves the data needed to render a CTA: href/label/target plus
 * iconLeft/iconRight/iconVariant. Returns `null` when the link is disabled
 * (link-type === "none") or cannot be resolved (no target URL, no label).
 *
 * `linkTypeProperty` lets a node expose the link-type gate under a custom
 * property name (e.g. `donwloadApp` on `sofnt:navMenu`) instead of the
 * default `j:linkType`.
 */
export function readLink(
	linkNode: JCRNodeWrapper,
	linkTypeProperty: string = "j:linkType",
): LinkData | null {
	const linkType = str(linkNode, linkTypeProperty, "none");
	if (linkType === "none") return null;

	const linkedNode = getPropertyAsNode(linkNode, "j:linknode");
	const url = str(linkNode, "j:url", "");
	const href = linkedNode ? buildNodeUrl(linkedNode) : url;
	if (!href) return null;

	const label = str(linkNode, "j:linkTitle", "") || str(linkNode, "jcr:title", "");
	if (!label) return null;

	const target = str(linkNode, "j:target", "_self") as "_self" | "_blank";

	return {
		href,
		label,
		target,
		iconLeft: readIcon(linkNode, "iconLeft"),
		iconRight: readIcon(linkNode, "iconRight"),
		iconVariant: readIconVariant(linkNode),
	};
}

/**
 * Reads a link whose fields are declared *inline* on the host node under a
 * shared `prefix`, using the `linkChooserInitializer` + `jmix:dynamicFieldset`
 * pattern (see `LinkChooserInitializer.java`). The selector property
 * `<prefix>LinkType` (`none` | `internal` | `external`) drives which fieldset
 * is shown:
 *  - `internal` → `<prefix>InternalNode` (weakreference)
 *  - `external` → `<prefix>ExternalUrl` (string)
 * with shared `<prefix>Label` / `<prefix>Target`.
 *
 * Use this when a single node needs several independent links and cannot share
 * the `jmix:link` `j:*` properties (those exist only once per node and collide).
 *
 * Returns `null` when the link is disabled (`<prefix>LinkType === "none"`) or
 * cannot be resolved (no target URL, no label).
 */
export function readPrefixedLink(node: JCRNodeWrapper, prefix: string): LinkData | null {
	const linkType = str(node, `${prefix}LinkType`, "none");
	if (linkType !== "internal" && linkType !== "external") return null;

	let href = "";
	if (linkType === "internal") {
		const linkedNode = getPropertyAsNode(node, `${prefix}InternalNode`);
		href = linkedNode ? buildNodeUrl(linkedNode) : "";
	} else {
		href = str(node, `${prefix}ExternalUrl`, "");
	}
	if (!href) return null;

	const label = str(node, `${prefix}Label`, "");
	if (!label) return null;

	const target = str(node, `${prefix}Target`, "_self") as LinkTarget;

	return {
		href,
		label,
		target,
		iconVariant: "primary",
	};
}

/**
 * Convenience wrapper: reads the named child node (default "link") of a
 * parent JCR node, then delegates to {@link readLink}. Returns `null` when
 * the child is missing or the link is unresolvable.
 */
export function readLinkChild(parent: JCRNodeWrapper, childName: string = "link"): LinkData | null {
	const linkNode =
		getChildNode(parent, childName) ?? getChildNodesByType(parent, "sofnt:link")[0] ?? null;
	return linkNode ? readLink(linkNode) : null;
}
