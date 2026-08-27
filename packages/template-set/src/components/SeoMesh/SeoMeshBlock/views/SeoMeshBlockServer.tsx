import { RenderChildren } from "@jahia/javascript-modules-library";
import type { SeoMeshBlockPropsServer } from "../seoMeshBlock.types";
import classes from "./seoMeshBlock.module.css";
import clsx from "clsx";
import { ArrowRight } from "sofinco-react";

export function SeoMeshBlockServer(props: SeoMeshBlockPropsServer) {
	const MainTitleTag = props.titleLevel ? (props.titleLevel as React.ElementType) : "p";

	return (
		<div className={classes.seoBlockContainer}>
			<div className={classes.leftColumn}>
				<MainTitleTag
					className={clsx(classes.mainTitle, props.titleSize && classes[props.titleSize])}
				>
					{props.title}
				</MainTitleTag>

				<a
					href={props.ctaUrl}
					className={classes.ctaButton}
					aria-label={props.ariaLabel || props.ctaTitle}
				>
					{props.ctaTitle}
					<span className={classes.ctaIconWrapper}>
						<span className={classes.ctaIconArrow}>
							<ArrowRight />
						</span>
					</span>
				</a>
			</div>

			<div className={classes.rightColumn}>
				<RenderChildren nodeTypes={["spnt:seoLinksSubBlock"]} filter="spnt:seoLinksSubBlock" />
			</div>
		</div>
	);
}
