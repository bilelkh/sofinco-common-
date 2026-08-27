import type { AvisClientsStickerProps } from "./avisClientsSticker.types";
import classes from "./avisClientsSticker.module.css";
import clsx from "clsx";
import { StarRating } from "./components/StarRating";
import Image from "@shared/ui/Image";

export function AvisClientsSticker({
	avisLogoUrl,
	ratingScore,
	ratingReviewsCount,
	avisTitle,

	direction = "column",
	variant,
	theme = "dark",
}: AvisClientsStickerProps) {
	return (
		<div
			className={clsx(classes["avis-clients-sticker"], {
				[classes[`avis-clients-sticker--${direction}`]]: direction,
			})}
			data-theme={theme}
			data-variant={variant}
		>
			{avisLogoUrl && (
				<Image
					src={avisLogoUrl}
					alt={avisTitle ?? ""}
					width={137}
					height={31}
					className={classes["avis-clients-sticker__logo"]}
				/>
			)}
			{ratingScore && (
				<p className={classes["avis-clients-sticker__rating-text"]}>
					{ratingReviewsCount} avis • {ratingScore}{" "}
					<StarRating ratingScore={ratingScore} theme={theme} />
				</p>
			)}
		</div>
	);
}
