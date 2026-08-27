import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ProductAdvantageCategory } from "sofinco-react";
import { str, imgUrl } from "#lib/jcr";

/**
 * Maps a `sofnt:productAdvantageCategory` JCR node to the React
 * `ProductAdvantageCategory` consumed by the `ProductAdvantages` carousel.
 *
 * `jcr:title` holds the tab label; `heading` and `text` are HTML-contributed
 * (richtext) and rendered as the overlay title/text.
 */
export function mapProductAdvantageCategory(node: JCRNodeWrapper): ProductAdvantageCategory {
	return {
		id: node.getIdentifier(),
		label: str(node, "jcr:title"),
		title: str(node, "heading"),
		text: str(node, "text"),
		imageDesktop: imgUrl(node, "imageDesktop"),
		imageMobile: imgUrl(node, "imageMobile"),
		imageAlt: str(node, "imageAlt") || undefined,
	};
}
