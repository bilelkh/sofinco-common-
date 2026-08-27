import { OfferRateDisplay } from "../../OfferRateDisplay/index.js";
import Cta from "@shared/ui/Cta/Cta";
import type { OfferSlideRateProps } from "./offer-slide-rate.types.js";
import classes from "./OfferSlideRate.module.css";
import { FootnoteText } from "@shared/footnotes";

export function OfferSlideRate({
	eyebrow,
	description,
	rateValue,
	rateSuffix,
	cta,
}: OfferSlideRateProps) {
	return (
		<article className={classes["offer-slide-rate"]}>
			<div className={classes["offer-slide-rate__headline"]}>
				<OfferRateDisplay rateValue={rateValue} rateSuffix={rateSuffix} />
			</div>

			<div className={classes["offer-slide-rate__body"]}>
				<span className={classes["offer-slide-rate__eyebrow"]}>
					<FootnoteText>{eyebrow}</FootnoteText>
				</span>
				<p className={classes["offer-slide-rate__description"]}>
					<FootnoteText>{description}</FootnoteText>
				</p>
				<Cta {...cta} className={classes["offer-slide-rate__cta"]} />
			</div>
		</article>
	);
}
