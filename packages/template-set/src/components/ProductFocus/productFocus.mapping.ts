import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ProductFocusProps } from "sofinco-react";
import { str, imgUrl, getWrapperItems } from "#lib/jcr";
import { buildTitleProps } from "../Shared/HeadingStyle/headingStyle.mapping";
import { mapProductFocusItem } from "./ProductFocusItem/productFocusItem.mapping";

const ITEM_NODE_TYPE = "sofnt:productFocusItem";
const WRAPPER_NODE_TYPE = "sofnt:productFocusItemList";

/** CND autocreated default — mirrored here as a defensive fallback for legacy
 *  nodes where the property could be missing or empty. Must stay aligned with
 *  `definition.cnd`. */
const DEFAULT_BACKGROUND_COLOR = "#f5f9fc";

/**
 * Maps a `sofnt:productFocus` JCR node to `<ProductFocus>` DS props.
 *
 * `ProductFocus` supports **standalone usage** (own heading + background) and
 * **embedded usage** (inside `sofnt:arrayFocusWrapper`, which strips
 * `title/subtitle/backgroundColor` at compose time because the wrapper owns
 * the section header + surface).
 *
 * Structure JCR :
 *   sofnt:productFocus
 *   ├─ leftFeatures  (sofnt:productFocusItemList autocreated)
 *   │  └─ sofnt:productFocusItem[]
 *   └─ rightFeatures (sofnt:productFocusItemList autocreated)
 *      └─ sofnt:productFocusItem[]
 */
export function mapProductFocusProps(node: JCRNodeWrapper): ProductFocusProps {
	const featuresIn = (wrapperName: string) =>
		getWrapperItems(node, WRAPPER_NODE_TYPE, ITEM_NODE_TYPE, wrapperName).map(mapProductFocusItem);

	return {
		title: buildTitleProps(node, str(node, "jcr:title"), "h2"),
		subtitle: str(node, "subtitle") || undefined,
		imageSrc: imgUrl(node, "image"),
		leftFeatures: featuresIn("leftFeatures"),
		rightFeatures: featuresIn("rightFeatures"),
		// `|| DEFAULT` — defensive: catches both missing property AND empty
		// string (str() with fallback only handles the missing case).
		backgroundColor: str(node, "backgroundColor") || DEFAULT_BACKGROUND_COLOR,
	};
}
