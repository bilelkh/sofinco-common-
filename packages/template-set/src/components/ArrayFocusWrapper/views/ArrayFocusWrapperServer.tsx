import { RenderChild } from "@jahia/javascript-modules-library";
import type { ArrayFocusWrapperServerProps } from "../arrayFocusWrapper.type";
import classes from "./arrayFocusWrapper.module.css";

export default function ArrayFocusWrapperServer({
	backgroundColor,
	title,
	subtitle,
	hasHeader,
}: ArrayFocusWrapperServerProps) {
	return (
		<section className={classes.editPreview} style={{ backgroundColor }}>
			{hasHeader && (
				<header className={classes.editPreviewHeader}>
					{title && <div className={classes.editPreviewTitle}>{title}</div>}
					{subtitle && <p className={classes.editPreviewSubtitle}>{subtitle}</p>}
				</header>
			)}
			<RenderChild name="productFocus" />
			<RenderChild name="seoBlock" />
			<RenderChild name="insuranceFocus" />
		</section>
	);
}
