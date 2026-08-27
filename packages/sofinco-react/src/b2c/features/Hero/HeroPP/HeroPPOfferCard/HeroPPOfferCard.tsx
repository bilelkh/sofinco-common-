import type { HeroPPOfferCardProps } from "./HeroPPOfferCard.type";
import { getFormattedRateParts } from "@b2c/features/Hero/formatRate";
import Image from "@shared/ui/Image";
import styles from "./HeroPPOfferCard.module.css";
import { sanitizeHtml } from "@utils/sanitizeHtml";
import { FootnoteText } from "@shared/footnotes";

export default function HeroPPOfferCard({ infoBlock, imgSrc, imgSrcMobile }: HeroPPOfferCardProps) {
	const formattedRate = getFormattedRateParts(infoBlock?.rate);
	return (
		<aside className={styles.card} aria-label="Offre de financement mise en avant">
			{infoBlock && formattedRate && (
				<div className={styles.card__top}>
					<div className={styles.card__rateCluster}>
						<p className={styles.card__rate} aria-hidden="true">
							<span className={styles.card__rateInteger}>{formattedRate.integerPart}</span>
							{formattedRate.decimalPart && formattedRate.symbol && (
								<span className={styles.card__rateDecimalCluster}>
									<span className={styles.card__rateDecimal}>
										{formattedRate.decimalPart}
										{formattedRate.symbol}
									</span>
									<span className={styles.card__rateLabel}>
										<FootnoteText>{infoBlock.rateLabel}</FootnoteText>
									</span>
								</span>
							)}
						</p>
					</div>
					{infoBlock.details && (
						<div
							className={styles.card__details}
							dangerouslySetInnerHTML={{ __html: sanitizeHtml(infoBlock.details) }}
						/>
					)}
				</div>
			)}
			{/* `.card__img` resolves to `height: auto` (its wrapper has no definite height), so
			    this ratio is what reserves the lower half of the card until the visual decodes.
			    Offer visuals are cut 500x500 desktop / 327x327 mobile. */}
			<div className={styles.card__imgWrapper}>
				<Image
					src={imgSrc}
					width={500}
					height={500}
					sources={
						imgSrcMobile
							? [{ media: "(max-width: 767px)", srcSet: imgSrcMobile, width: 327, height: 327 }]
							: undefined
					}
					decorative
					className={styles.card__img}
					pictureClassName={styles.card__picture}
					loading="eager"
					fetchPriority="high"
				/>
			</div>
		</aside>
	);
}
