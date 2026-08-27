import { RenderChildren } from "@jahia/javascript-modules-library";
import classes from "./cardAdvantages.module.css";
import clsx from "clsx";

import type { CardAdvantagesProps } from "sofinco-react";
import { Cta } from "sofinco-react";

export function CardAdvantagesServer({
	title,
	subtitle,
	cardImage,
	cta,
	momentsTitle,
	momentsSubtitle,
	imageDesktop,
	imageMobile,
	className,
}: CardAdvantagesProps) {
	return (
		<section className={clsx(classes.wrapper, className)}>
			<div className={classes.zone1}>
				<div className={classes.zone1Header}>
					{title && <h2 className={classes.title}>{title}</h2>}
					{subtitle && <p className={classes.subtitle}>{subtitle}</p>}
				</div>

				<div className={classes.stickyContainer}>
					<div className={classes.stickyMedia}>
						{cardImage && (
							<div className={classes.cardVisualWrapper}>
								<img src={cardImage} alt={title || ""} className={classes.cardVisual} />
							</div>
						)}
						{cta && (
							<div className={classes.ctaWrapper}>
								<Cta {...cta} />
							</div>
						)}
					</div>

					<div className={classes.argumentsList}>
						<RenderChildren nodeTypes={["sofnt:cardArgument"]} filter="sofnt:cardArgument" />
					</div>
				</div>
			</div>

			<div className={classes.zone2}>
				<div className={classes.zone2Header}>
					{momentsTitle && <h2 className={classes.title}>{momentsTitle}</h2>}
					{momentsSubtitle && <p className={classes.subtitle}>{momentsSubtitle}</p>}
				</div>

				<div className={classes.imageBackground}>
					<picture>
						{imageDesktop && <source srcSet={imageDesktop} media="(min-width: 768px)" />}
						<img
							src={imageMobile || imageDesktop}
							alt={momentsTitle || ""}
							className={classes.imageCover}
						/>
					</picture>
				</div>
			</div>
		</section>
	);
}
