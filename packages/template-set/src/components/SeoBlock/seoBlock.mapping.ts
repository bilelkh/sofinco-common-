import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { SeoBlockProps, AvailableColors, TitleLevel } from "sofinco-react";
import { str, getAsBoolean } from "#lib/jcr";
import type { SeoBlockServerProps } from "./seoBlock.type";

const COLORS: AvailableColors[] = ["primary", "accent", "green", "red"];
const LEVELS: TitleLevel[] = ["h2", "h3"];

/** Reads a colour property, falling back to "primary" for missing / unknown values. */
function readColor(node: JCRNodeWrapper, property: string): AvailableColors {
	const raw = str(node, property, "primary");
	return COLORS.includes(raw as AvailableColors) ? (raw as AvailableColors) : "primary";
}

/** Reads the title heading level, falling back to "h2" for missing / unknown values. */
function readLevel(node: JCRNodeWrapper, property: string): TitleLevel {
	const raw = str(node, property, "h2");
	return LEVELS.includes(raw as TitleLevel) ? (raw as TitleLevel) : "h2";
}

/**
 * Maps a `sofnt:seoBlock` JCR node to `<SeoBlock>` DS props.
 *
 * `content` is optional on the CND : an empty rich text yields an empty
 * `sections` array (title-only block) rather than a section holding an empty
 * string — same "no content" shape as the `ArrayFocusWrapper` fallback.
 */
export function mapSeoBlockProps(node: JCRNodeWrapper): SeoBlockProps {
	const level = readLevel(node, "titleSize");
	const content = str(node, "content");

	return {
		title: {
			children: str(node, "jcr:title"),
			as: level,
			visualStyle: level,
		},
		sections: content
			? [
					{
						id: node.getIdentifier(),
						content,
						color: readColor(node, "textColor"),
					},
				]
			: [],
		isCentered: getAsBoolean(node, "isCentered", false),
	};
}

/**
 * Maps `sofnt:seoBlock` DS props to `<SeoBlockServer>` props (edit-mode
 * preview flags).
 *
 * Only `jcr:title` is mandatory on the CND — `content` is optional, so an
 * empty rich text is never reported to the contributor.
 */
export function mapSeoBlockServerProps(dsProps: SeoBlockProps): SeoBlockServerProps {
	return {
		missingTitle: !dsProps.title.children,
	};
}
