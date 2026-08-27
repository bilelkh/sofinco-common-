import type { LinkProps } from "@shared/ui/Link/Link.type";

export interface FaqItem {
	id: string;
	question: string;
	answer: string;
}

/**
 * Configuration for the Smart Tribune external FAQ widget. Mirrors the
 * `sofmix:faqIntegration` mixin fields. Only present when `useExternalSource`
 * is true.
 */
export interface FaqIntegration {
	/** URL of the Smart Tribune loader script. */
	jsUrl: string;
	/** Smart Tribune knowledge-base id. */
	kbId: string;
	/** Comma-separated list of thematics used to filter the FAQ. */
	thematicsFilter?: string;
	/** Comma-separated list of tags used to filter the FAQ. */
	tagsFilter?: string;
	/** When true, tags are combined with OR instead of AND. */
	tagsOr?: boolean;
	/** Require explicit cookie opt-in before loading the widget. */
	cookieOptin?: boolean;
	/** Restrict results to the search-filtered set. */
	searchFiltered?: boolean;
	/** DOM id of an external header element to bind the widget to. */
	headerId?: string;
	/**
	 * Extra init parameters, one `key:value` entry per item. The value is parsed
	 * as JSON when possible (e.g. `customResponses:["sofinco-2057"]`), otherwise
	 * kept as a raw string. Each entry is merged into the widget config.
	 */
	extraParams?: string[];
}

export interface FaqProps {
	title: string;
	subtitle: string;
	imageUrl: string;
	imageAlt: string;
	/** Semantic heading level (HTML tag) for the FAQ title. Defaults to `h2`. */
	titleAs?: "h1" | "h2" | "h3" | "h4";
	/**
	 * Visual style of the FAQ title, independent of its semantic level. When
	 * omitted the title keeps its default (H2) appearance.
	 */
	titleStyle?: "h1" | "h2" | "h3" | "h4";
	items: FaqItem[];
	/** Optional centered link rendered at the bottom, below the items. */
	link?: LinkProps;
	/**
	 * If true, the items list is replaced by the Smart Tribune external FAQ
	 * widget (loaded from `integration.jsUrl`). The `items` prop is ignored in
	 * that mode and `integration` carries the widget configuration.
	 */
	useExternalSource?: boolean;
	/** Smart Tribune widget config — required when `useExternalSource` is true. */
	integration?: FaqIntegration;
}
