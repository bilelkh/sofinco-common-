import type { OfferSlideColoredProps } from "./offer-slide-colored.types.js";
import classes from "./OfferSlideColored.module.css";
import Cta from "@shared/ui/Cta/Cta";
import Image from "@shared/ui/Image";
import { FootnoteText } from "@shared/footnotes";

export function OfferSlideColored({
	title,
	description,
	eyebrow,
	backgroundColor,
	img,
	cta,
}: OfferSlideColoredProps) {
	return (
		<article
			className={classes["offer-slide-colored"]}
			style={{ backgroundColor: backgroundColor }}
		>
			<div className={classes["offer-slide-colored__illustration-wrapper"]}>
				<Image
					src={img}
					decorative
					width={330}
					height={330}
					className={classes["offer-slide-colored__illustration"]}
				/>
			</div>
			<div className={classes["offer-slide-colored__content"]}>
				<h3 className={classes["offer-slide-colored__title"]}>
					<FootnoteText>{title}</FootnoteText>
				</h3>
				<p className={classes["offer-slide-colored__description"]}>
					<FootnoteText>{description}</FootnoteText>
				</p>
				{eyebrow && (
					<span className={classes["offer-slide-colored__eyebrow"]}>
						<FootnoteText>{eyebrow}</FootnoteText>
					</span>
				)}
				{cta && <Cta {...cta} className={classes["offer-slide-colored__cta"]} />}
			</div>
		</article>
	);
}
