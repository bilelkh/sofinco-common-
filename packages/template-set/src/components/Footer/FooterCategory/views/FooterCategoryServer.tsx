import { RenderChildren } from "@jahia/javascript-modules-library";
import type { FooterCategoryPropsServer } from "../footerCategory.types";
import classes from "./footerCategory.module.css";

export function FooterCategoryServer(props: FooterCategoryPropsServer) {
	return (
		<div className={classes.categoryColumn}>
			<label className={classes.labelTitle}>{props.title}</label>

			<ul className={classes.linkList}>
				<RenderChildren filter="sofnt:footerLink" nodeTypes={["sofnt:footerLink"]} />
			</ul>
		</div>
	);
}
