import React from "react";
import type { AppShowcaseFeatureProps } from "../appShowcaseFeature.types";
import classes from "./appShowcaseFeature.module.css";

export function AppShowcaseFeature(props: AppShowcaseFeatureProps) {
	return (
		<article className={classes.featureCard}>
			{props.iconUrl && <img src={props.iconUrl} alt="" className={classes.featureIcon} />}
			<h3 className={classes.featureTitle}>{props.featureTitle}</h3>
			<p className={classes.featureText}>{props.featureText}</p>
		</article>
	);
}
