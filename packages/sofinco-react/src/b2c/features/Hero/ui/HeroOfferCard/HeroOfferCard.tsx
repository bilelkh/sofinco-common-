import Cta from "@shared/ui/Cta/Cta";
import type { HeroOfferCardProps } from "@b2c/features/Hero/ui/HeroOfferCard/HeroOfferCard.type";
import styles from "@b2c/features/Hero/ui/HeroOfferCard/HeroOfferCard.module.css";
import { FootnoteText } from "@shared/footnotes";

function getFormattedRateParts(rate?: string) {
	const normalizedRate = rate?.replace(/\s+/g, "").trim();

	if (!normalizedRate) {
		return null;
	}

	return {
		integerPart: normalizedRate.match(/^\d+/)?.[0] ?? normalizedRate,
		decimalPart: normalizedRate.match(/[,.]\d+/)?.[0] ?? "",
		symbol: normalizedRate.includes("%") ? "%" : "",
	};
}

function getFormattedAmountParts(amount?: string) {
	if (!amount) {
		return null;
	}

	const normalizedAmount = amount.trim();
	const matches = normalizedAmount.match(/^(.*?)(\d[\d\s.,]*\s*€?)$/);

	if (!matches) {
		return {
			prefix: "",
			value: normalizedAmount,
		};
	}

	return {
		prefix: (matches[1] ?? "").trim(),
		value: (matches[2] ?? "").trim(),
	};
}

export default function HeroOfferCard({
	titleBadge,
	badge,
	rate,
	rateLabel,
	rateLabelBis,
	amount,
	legalText,
	cta,
	pinned = false,
}: HeroOfferCardProps) {
	if (!titleBadge && !badge && !rate && !rateLabel && !amount && !legalText && !cta) {
		return null;
	}

	const formattedRate = getFormattedRateParts(rate);
	const rateAccessibleLabel = [rate, rateLabel].filter(Boolean).join(" ");
	const formattedAmount = getFormattedAmountParts(amount);

	return (
		<aside
			className={`${styles.offer}${pinned ? ` ${styles["offer--pinned"]}` : ""}`}
			aria-label="Offre de financement mise en avant"
		>
			{(titleBadge || badge) && (
				<p className={styles.offer__badge}>
					{titleBadge && (
						<span className={styles.offer__title}>
							<FootnoteText>{titleBadge}</FootnoteText>
						</span>
					)}
					{badge && <span className={styles.offer__badgeLabel}>{badge}</span>}
				</p>
			)}

			<div className={styles.offer__rateBlock}>
				{formattedRate && (
					<div className={styles.offer__rateCluster}>
						<p className={styles.offer__rate} aria-hidden="true">
							<span className={styles.offer__rateInteger}>{formattedRate.integerPart}</span>
							{formattedRate.decimalPart && formattedRate.symbol && (
								<span className={styles.offer__rateDecimalCluster}>
									<span className={styles.offer__rateDecimal}>
										{formattedRate.decimalPart}
										{formattedRate.symbol}
									</span>
									<span className={styles.offer__rateLabel}>
										{" "}
										<FootnoteText>{rateLabel}</FootnoteText>
									</span>
									<span className={styles.offer__rateLabelBis}>
										{" "}
										<FootnoteText>{rateLabelBis}</FootnoteText>
									</span>
								</span>
							)}
						</p>

						{rateAccessibleLabel && (
							<span className="sr-only">
								<FootnoteText>{rateAccessibleLabel}</FootnoteText>
							</span>
						)}
					</div>
				)}
			</div>

			{formattedAmount && (
				<p className={styles.offer__amount}>
					{formattedAmount.prefix} {formattedAmount.value}
				</p>
			)}

			{cta && <Cta {...cta} className={styles.offer__cta} />}

			{legalText && (
				<p className={styles.offer__legal}>
					<FootnoteText>{legalText}</FootnoteText>
				</p>
			)}
		</aside>
	);
}
