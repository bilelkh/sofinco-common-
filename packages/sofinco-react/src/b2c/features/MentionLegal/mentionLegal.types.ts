export interface MentionLegalItem {
	/**
	 * Slugified anchor id used as the element id for deep links (may be empty).
	 * In Jahia this is derived from the `anchor` property of the `sofnt:mentionLegalItem` node.
	 */
	anchorId: string;
	/** Pre-rendered rich-text HTML of the paragraph. */
	content: string;
}

export interface MentionLegalProps {
	/** Clickable heading that toggles the block open/closed. */
	title: string;
	/** Legal paragraphs revealed when the block is open. */
	items: MentionLegalItem[];
	/**
	 * Initial expanded state on first paint. Driven by the Jahia `initiallyOpen`
	 * boolean. Must be a stable value (no `window` reads) to stay SSR-safe.
	 */
	initiallyOpen?: boolean;
}
