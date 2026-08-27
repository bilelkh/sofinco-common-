import { RenderChild } from "@jahia/javascript-modules-library";

import classes from "./section.module.css";

export default function HeroSectionServer() {
	return (
		<section className={classes.editSection}>
			<header className={classes.editHeader}>
				<span className={classes.editHeaderLabel}>Configuration du Hero</span>
			</header>
			<div className={classes.editZones}>
				<div className={classes.heroQrWrapper}>
					<RenderChild name="heroQr" />
				</div>
				<RenderChild name="hero" />
				<div className={classes.simContainer}>
					<RenderChild name="simulator" />
				</div>
			</div>
		</section>
	);
}
