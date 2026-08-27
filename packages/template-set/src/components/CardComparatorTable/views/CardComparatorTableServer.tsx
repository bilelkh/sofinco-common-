import { RenderChild } from "@jahia/javascript-modules-library";
import type { CardComparatorTableProps } from "sofinco-react";
import classes from "./cardComparatorTable.module.css";

/**
 * Edit-mode preview: shows the contributed title/subtitle and exposes each
 * card as an editable child via `RenderChild`. The live view renders the
 * hydrated grid/slider Island instead.
 */
export function CardComparatorTableServer(props: CardComparatorTableProps) {
	return (
		<section className={classes.editPreview}>
			<div className={classes.editHint}>
				Comparateur de cartes — {props.items?.length ?? 0} carte(s)
			</div>
			{props.title && <p className={classes.editTitle}>{props.title}</p>}
			{props.subtitle && <p className={classes.editSubtitle}>{props.subtitle}</p>}

			<div className={classes.editCards}>
				<RenderChild name="cards" />
			</div>
		</section>
	);
}
