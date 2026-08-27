import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ArrayFocusWrapperProps } from "sofinco-react";
import { str, getChildNode } from "#lib/jcr";
import { readTitleLevel, readTitleStyle } from "../Shared/HeadingStyle/headingStyle.mapping";
import { mapProductFocusProps } from "../ProductFocus/productFocus.mapping";
import { mapSeoBlockProps } from "../SeoBlock/seoBlock.mapping";
import { mapInsuranceFocusProps } from "../InsuranceFocus/insuranceFocus.mapping";
import type { ArrayFocusWrapperServerProps } from "./arrayFocusWrapper.type";

/** CND autocreated default — mirrored here as a defensive fallback for legacy
 *  nodes where the property could be missing or empty. Must stay aligned with
 *  `definition.cnd` (`backgroundColor = '#DFF1FC' autocreated`). */
const DEFAULT_BACKGROUND_COLOR = "#DFF1FC";

/**
 * Maps `sofnt:arrayFocusWrapper` to the DS `<ArrayFocusWrapper>` props (live
 * view).
 */
export function mapArrayFocusWrapperProps(node: JCRNodeWrapper): ArrayFocusWrapperProps {
	const productFocusNode = getChildNode(node, "productFocus");
	const seoBlockNode = getChildNode(node, "seoBlock");
	const insuranceFocusNode = getChildNode(node, "insuranceFocus");

	const titleText = str(node, "jcr:title");
	const subtitleText = str(node, "subtitle");

	return {
		sectionHeading: {
			title: titleText || undefined,
			subtitle: subtitleText || undefined,
			titleAs: readTitleLevel(node, "h2"),
			visualStyle: readTitleStyle(node, "h2"),
			align: "center",
		},
		backgroundColor: str(node, "backgroundColor") || DEFAULT_BACKGROUND_COLOR,
		productFocus: mapProductFocusForWrapper(productFocusNode),
		seoBlock: seoBlockNode
			? mapSeoBlockProps(seoBlockNode)
			: {
					title: { children: "", as: "h3", visualStyle: "h3" },
					sections: [],
					isCentered: false,
				},
		insuranceFocus: insuranceFocusNode
			? mapInsuranceFocusProps(insuranceFocusNode)
			: {
					title: { children: "", as: "h3", visualStyle: "h3" },
					description: "",
					imageSrc: "",
					imageAlt: "",
					cta: {
						label: "",
						href: "",
						target: "_self",
						ctaSection: "insurance-focus",
						variant: "accent",
					},
				},
	};
}

/**
 * Strips `title`, `subtitle`, `backgroundColor` from the ProductFocus mapping
 * output — matches the wrapper's `Omit<ProductFocusProps, ...>` type contract.
 * Also used to build a body-only fallback when the child is absent.
 */
function mapProductFocusForWrapper(
	node: JCRNodeWrapper | null,
): ArrayFocusWrapperProps["productFocus"] {
	if (!node) {
		return { imageSrc: "", leftFeatures: [], rightFeatures: [] };
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { title, subtitle, backgroundColor, ...body } = mapProductFocusProps(node);
	return body;
}

/**
 * Maps `sofnt:arrayFocusWrapper` to `<ArrayFocusWrapperServer>` props
 * (edit-mode preview).
 */
export function mapArrayFocusWrapperServerProps(
	node: JCRNodeWrapper,
): ArrayFocusWrapperServerProps {
	const title = str(node, "jcr:title");
	const subtitle = str(node, "subtitle");

	return {
		backgroundColor: str(node, "backgroundColor") || DEFAULT_BACKGROUND_COLOR,
		title,
		subtitle,
		hasHeader: Boolean(title) || Boolean(subtitle),
	};
}
