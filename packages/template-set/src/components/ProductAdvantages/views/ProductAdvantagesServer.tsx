import { RenderChild } from "@jahia/javascript-modules-library";
import type { ProductAdvantagesProps } from "sofinco-react";
import classes from "./productAdvantages.module.css";

/**
 * Edit-mode preview: shows the contributed title/subtitle and exposes each
 * category as an editable child via `RenderChild`. The live view renders the
 * hydrated carousel Island instead.
 */
export function ProductAdvantagesServer(props: ProductAdvantagesProps) {
	return (
		<section className={classes.editPreview}>
			<div className={classes.editHint}>
				Avantages produit — {props.categories?.length ?? 0} catégorie(s)
			</div>
			<p className={classes.editTitle}>{props.title}</p>
			{props.subtitle && <p className={classes.editSubtitle}>{props.subtitle}</p>}

			<div className={classes.editSlides}>
				<RenderChild name="categories" />
			</div>
		</section>
	);
}
