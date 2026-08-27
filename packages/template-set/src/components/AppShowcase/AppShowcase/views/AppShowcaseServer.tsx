import React from "react";
import { RenderChildren, RenderChild } from "@jahia/javascript-modules-library";
import type { AppShowcaseProps } from "../appShowcase.types";
import classes from "./appShowcase.module.css";
import clsx from "clsx";

export function AppShowcaseServer(props: AppShowcaseProps) {
	return (
		<div
			className={clsx(classes.editWrapper, props.backgroundColor && classes[props.backgroundColor])}
		>
			<div className={classes.header}>
				{props.mainIconUrl && (
					<img src={props.mainIconUrl} alt="Main Icon" className={classes.mainIcon} />
				)}
				<h2 className={classes.title}>{props.title}</h2>
				<p className={classes.subtitle}>{props.subtitle}</p>
			</div>

			<div className={classes.qrCodeZone}>
				<RenderChild name="qrCode" />
			</div>

			<div className={classes.contentWrapper}>
				<div className={classes.featuresGrid}>
					<RenderChildren
						nodeTypes={["sofnt:appShowcaseFeature"]}
						filter="sofnt:appShowcaseFeature"
					/>
				</div>
				<div className={classes.centralImageWrapper}>
					{props.mobileImageUrl && (
						<img src={props.mobileImageUrl} className={classes.phoneImage} />
					)}
				</div>
			</div>
		</div>
	);
}
