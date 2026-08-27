import clsx from "clsx";
import type { OfferRateDisplayProps } from "./offer-rate-display.types.js";
import classes from "./OfferRateDisplay.module.css";
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

export function OfferRateDisplay({ rateValue, rateSuffix, className }: OfferRateDisplayProps) {
	const formattedRate = getFormattedRateParts(rateValue);
	const rateAccessibleLabel = [rateValue, rateSuffix].filter(Boolean).join(" ");

	if (!rateValue) {
		return null;
	}

	return (
		<div className={clsx(classes["offer-rate-display"], className)}>
			{formattedRate ? (
				<div className={classes["offer-rate-display__cluster"]}>
					<p className={classes["offer-rate-display__rate"]} aria-hidden="true">
						<span className={classes["offer-rate-display__integer"]}>
							{formattedRate.integerPart}
						</span>
						{formattedRate.decimalPart && formattedRate.symbol && (
							<span className={classes["offer-rate-display__decimal-cluster"]}>
								<span className={classes["offer-rate-display__decimal"]}>
									{formattedRate.decimalPart}
									{formattedRate.symbol}
								</span>
								<span className={classes["offer-rate-display__label"]}>{rateSuffix}</span>
							</span>
						)}
					</p>

					{rateAccessibleLabel && (
						<span className="sr-only">
							<FootnoteText>{rateAccessibleLabel}</FootnoteText>
						</span>
					)}
				</div>
			) : (
				<>
					<span className={classes["offer-rate-display__value"]}>{rateValue}</span>
					<span className={classes["offer-rate-display__label"]}>{rateSuffix}</span>
				</>
			)}
		</div>
	);
}
