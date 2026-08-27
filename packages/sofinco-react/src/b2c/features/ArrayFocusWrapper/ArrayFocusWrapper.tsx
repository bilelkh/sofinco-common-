import { useId } from "react";
import type { CSSProperties } from "react";
import clsx from "clsx";

import SectionHeading from "@shared/ui/SectionHeading";
import { ProductFocus } from "@b2c/features/ProductFocus";
import { SeoBlock } from "@b2c/features/SeoBlock";
import { InsuranceFocus } from "@b2c/features/InsuranceFocus";
import type { ArrayFocusWrapperProps } from "./arrayFocusWrapper.types";
import classes from "./arrayFocusWrapper.module.css";

/**
 * Grouping section for the "product in detail" page pattern: a standalone
 * `SectionHeading`, the `ProductFocus` spotlight, a `SeoBlock` text block,
 * and the `InsuranceFocus` promo card, all sharing one contributed
 * background color. All four blocks are required — this composes a fixed
 * layout, not a pick-and-choose one.
 *
 * The wrapper paints the background and padding once; each child's own
 * section wash and outer padding are neutralized through its public
 * `className`/`backgroundColor` props (no reaching into a child's internal
 * CSS classes) so the group reads as one continuous surface. Each block
 * keeps its own props contract — this component only composes, it
 * duplicates no logic.
 */
export function ArrayFocusWrapper({
	sectionHeading,
	productFocus,
	seoBlock,
	insuranceFocus,
	backgroundColor,
	className,
}: ArrayFocusWrapperProps) {
	const generatedId = useId();

	const hasHeadingTitle = Boolean(sectionHeading.title);
	const titleId = sectionHeading.id ?? `${generatedId}-title`;

	return (
		<section
			className={clsx(classes["array-focus-wrapper"], className)}
			aria-labelledby={hasHeadingTitle ? titleId : undefined}
			style={
				backgroundColor
					? ({ "--array-focus-wrapper-bg": backgroundColor } as CSSProperties)
					: undefined
			}
		>
			<SectionHeading
				align="center"
				{...sectionHeading}
				id={titleId}
				className={clsx(classes["array-focus-wrapper__heading"], sectionHeading.className)}
			/>

			<ProductFocus
				{...productFocus}
				backgroundColor="transparent"
				className={clsx(classes["array-focus-wrapper__product-focus"], productFocus.className)}
			/>

			<SeoBlock
				{...seoBlock}
				title={{ as: "h3", ...seoBlock.title }}
				className={clsx(classes["array-focus-wrapper__seo-block"], seoBlock.className)}
			/>

			<InsuranceFocus
				{...insuranceFocus}
				className={clsx(classes["array-focus-wrapper__insurance-focus"], insuranceFocus.className)}
			/>
		</section>
	);
}
