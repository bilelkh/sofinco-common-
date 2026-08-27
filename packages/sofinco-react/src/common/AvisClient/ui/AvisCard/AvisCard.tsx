import type { AvisCardProps } from "@common/AvisClient/AvisClient.type";
import styles from "@common/AvisClient/ui/AvisCard/AvisCard.module.css";
import { StarRating } from "@b2c/features/AvisClientsSticker/components/StarRating";
import { FootnoteText } from "@shared/footnotes";

export default function AvisCard({
	rating,
	text,
	author,
	realizedDate,
	publishedDate,
	tone = "lilac",
	className,
}: AvisCardProps) {
	const clampedRating = Math.max(0, Math.min(5, Math.round(rating)));

	return (
		<article
			className={`${styles["avis-card"]} ${styles[`avis-card--${tone}`]} ${className ?? ""}`}
		>
			<StarRating
				ratingScore={clampedRating}
				maxStars={5}
				theme="inherit"
				showEmpty
				className={styles["avis-card__stars"]}
				aria-label={`${clampedRating} étoiles sur 5`}
			/>

			<p className={styles["avis-card__text"]}>
				<FootnoteText>{text}</FootnoteText>
			</p>

			<footer className={styles["avis-card__footer"]}>
				<p className={styles["avis-card__author"]}>{author}</p>
				<p className={styles["avis-card__dates"]}>
					Réalisée le {realizedDate} et publié le {publishedDate}
				</p>
			</footer>
		</article>
	);
}
