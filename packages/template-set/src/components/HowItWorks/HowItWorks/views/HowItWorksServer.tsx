import { RenderChildren, RenderChild } from "@jahia/javascript-modules-library";
import type { HowItWorksPropsServer } from "../howItWorks.types";
import classes from "./howItWorks.module.css";
import { Title, Cta } from "sofinco-react";

export function HowItWorksServer({ title, subtitle, cta, imagePosition }: HowItWorksPropsServer) {
	return (
		<section className={classes.howItWorksEdit}>
			<header className={classes.header}>
				{title && (
					<Title as={title.as} visualStyle={title.visualStyle} className={classes.title}>
						{title.children}
					</Title>
				)}
				{subtitle && <p className={classes.subtitle}>{subtitle}</p>}
			</header>

			<div
				className={
					imagePosition === "right" ? `${classes.steps} ${classes.stepsImageRight}` : classes.steps
				}
			>
				<RenderChildren nodeTypes={["sofnt:howItWorksStep"]} filter={"sofnt:howItWorksStep"} />
			</div>

			{cta && (
				<div className={classes.ctaWrapper}>
					<Cta {...cta} />
				</div>
			)}

			<div className={classes.videoZone}>
				<RenderChild nodeTypes={["sofnt:videoBlock"]} name="video" />
			</div>
		</section>
	);
}
