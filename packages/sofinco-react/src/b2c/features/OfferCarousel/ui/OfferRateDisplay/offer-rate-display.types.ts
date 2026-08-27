export interface OfferRateDisplayProps {
	/** Financial rate string to display (e.g. `"4,50%"`). Parsed into integer, decimal and symbol parts. */
	rateValue: string;
	/** Rate suffix displayed below the rate (e.g. `"TAEG FIXE"`). Hidden on desktop. */
	rateSuffix: string;
	/** Additional CSS class applied to the root element. */
	className?: string;
}