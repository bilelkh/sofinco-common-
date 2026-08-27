import clsx from "clsx";
import Cta from "@shared/ui/Cta/Cta";
import type { CSSProperties } from "react";
import type { OfferSlideGlossyProps } from "./offer-slide-glossy.types.js";
import classes from "./OfferSlideGlossy.module.css";
import { FootnoteText } from "@shared/footnotes";

export function OfferSlideGlossy({
	title,
	description,
	imgMobile,
	imgDesktop,
	cta,
}: OfferSlideGlossyProps) {
	const hasImage = Boolean(imgMobile || imgDesktop);
	const style = hasImage
		? ({
				"--offer-slide-glossy-mobile-image": `url(${imgMobile})`,
				"--offer-slide-glossy-desktop-image": `url(${imgDesktop || imgMobile})`,
			} as CSSProperties)
		: undefined;

	return (
		<article
			className={clsx(
				classes["offer-slide-glossy"],
				!hasImage && classes["offer-slide-glossy--fallback"],
			)}
			style={style}
		>
			<div className={classes["offer-slide-glossy__card"]}>
				<h3 className={classes["offer-slide-glossy__title"]}>
					<FootnoteText>{title}</FootnoteText>
				</h3>
				{description && (
					<p className={classes["offer-slide-glossy__description"]}>
						<FootnoteText>{description}</FootnoteText>
					</p>
				)}
				{cta && <Cta {...cta} variant="accent" className={classes["offer-slide-glossy__cta"]} />}
			</div>
		</article>
	);
}
