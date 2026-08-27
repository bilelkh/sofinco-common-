import { useId } from "react";
import type { CSSProperties } from "react";
import clsx from "clsx";

import SectionHeading from "@shared/ui/SectionHeading";
import Image from "@shared/ui/Image";
import type { ProductFocusProps } from "./ProductFocus.type";
import type { ProductFocusItemData } from "./ui/ProductFocusItem/ProductFocusItem.type";
import { ProductFocusItem } from "./ui/ProductFocusItem/ProductFocusItem";
import classes from "./ProductFocus.module.css";

/**
 * Product spotlight section: a central visual framed by two columns of short
 * label/description arguments, with a centered heading above.
 *
 * Jahia contributes `leftFeatures`/`rightFeatures` explicitly (same shape as
 * `OfferComparisonTable`'s `ComparisonOffer`), rather than a flat list split
 * automatically. Unlike `OfferComparisonTable` — which shares the same visual
 * language — nothing is compared or toggled here, so the markup is plain
 * lists, not a table.
 */
export function ProductFocus({
	title,
	subtitle,
	imageSrc,
	leftFeatures,
	rightFeatures,
	backgroundColor,
	className,
}: ProductFocusProps) {
	const headingId = useId();

	const hasTitle = Boolean(title?.children);
	const titleId = title?.id ?? `${headingId}-title`;
	// `hasContent` — gate the section on ANY contributed content so the block
	// isn't rendered empty. Heading + image alone are enough to display, even
	// if features aren't contributed yet (contributor might still be editing).
	const hasContent =
		hasTitle ||
		Boolean(subtitle) ||
		Boolean(imageSrc) ||
		leftFeatures.length > 0 ||
		rightFeatures.length > 0;
	if (!hasContent) return null;

	const hasImage = Boolean(imageSrc);
	const hasFeatures = leftFeatures.length > 0 || rightFeatures.length > 0;

	const renderItems = (columnItems: ProductFocusItemData[], side: "left" | "right") =>
		columnItems.length > 0 && (
			<ul className={clsx(classes["product-focus__list"], classes[`product-focus__list--${side}`])}>
				{columnItems.map((item) => (
					<ProductFocusItem key={item.id} label={item.label} description={item.description} />
				))}
			</ul>
		);

	return (
		<section
			className={clsx(classes["product-focus"], className)}
			aria-labelledby={hasTitle ? titleId : undefined}
			style={
				backgroundColor ? ({ "--product-focus-bg": backgroundColor } as CSSProperties) : undefined
			}
		>
			<div className={classes["product-focus__container"]}>
				{(hasTitle || subtitle) && (
					<SectionHeading
						titleAs={title?.as}
						visualStyle={title?.visualStyle}
						id={titleId}
						title={title?.children}
						subtitle={subtitle}
						align="center"
					/>
				)}

				{(hasImage || hasFeatures) && (
					<div className={classes["product-focus__grid"]}>
						{renderItems(leftFeatures, "left")}

						{hasImage && (
							<div className={classes["product-focus__media"]}>
								<Image
									className={classes["product-focus__image"]}
									src={imageSrc}
									decorative
									width={420}
									height={605}
								/>
							</div>
						)}

						{renderItems(rightFeatures, "right")}
					</div>
				)}
			</div>
		</section>
	);
}
