import { RenderChild } from "@jahia/javascript-modules-library";
import type { OfferComparisonTableProps } from "sofinco-react";
import classes from "./offerComparisonTable.module.css";

/**
 * Edit-mode preview: shows the contributed title and exposes each offer as an
 * editable child via `RenderChild`. The live view renders the hydrated
 * `OfferComparisonTable` Island instead.
 */
export function OfferComparisonTableServer(props: OfferComparisonTableProps) {
	return (
		<section className={classes.editPreview}>
			<div className={classes.editHint}>
				Comparatif d'offres — {props.offers?.length ?? 0} offre(s)
			</div>
			<p className={classes.editTitle}>{props.title}</p>

			<div className={classes.editOffers}>
				<RenderChild name="offers" />
			</div>
		</section>
	);
}
