import { RenderChildren } from "@jahia/javascript-modules-library";
import type { GuidePropsServer } from "../guide.mapping";
import classes from "./guide.module.css";

export function GuideServer({ title, titleSize = "h2", ctaLabel, ctaUrl }: GuidePropsServer) {
	const TitleTag = titleSize;
	const titleModifier = classes[`guide__title--${titleSize}`];

	return (
		<section className={classes.guide__container}>
			<div className={classes.guide__grid}>
				<div className={classes.guide__intro}>
					<TitleTag className={`${classes.guide__title} ${titleModifier}`}>{title}</TitleTag>
					{ctaLabel && ctaUrl && (
						<span className={classes["guide__cta-preview"]}>{ctaLabel} →</span>
					)}
				</div>

				<div>
					<RenderChildren nodeTypes={["sofnt:guideCategory"]} />
				</div>
			</div>
		</section>
	);
}
