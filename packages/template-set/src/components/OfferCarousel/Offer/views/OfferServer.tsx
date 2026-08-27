import { RenderChild } from "@jahia/javascript-modules-library";
import type { OfferCarouselProps } from "sofinco-react";
import classes from "./offer.module.css";

export function OfferServer(props: OfferCarouselProps) {
	return (
		<section className={classes.editPreview}>
			<div className={classes.editHint}>
				Carrousel — {props.slides?.length ?? 0} slide(s) contribuée(s)
			</div>

			<div className={classes.editSlides}>
				<RenderChild name="slides" />
			</div>
		</section>
	);
}
