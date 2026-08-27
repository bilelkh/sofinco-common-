export type FormattedRateParts = {
	integerPart: string;
	decimalPart: string;
	symbol: string;
};

export function getFormattedRateParts(rate?: string): FormattedRateParts | null {
	const normalizedRate = rate?.replace(/\s+/g, "").trim();
	if (!normalizedRate) return null;
	return {
		integerPart: normalizedRate.match(/^\d+/)?.[0] ?? normalizedRate,
		decimalPart: normalizedRate.match(/[,.]\d+/)?.[0] ?? "",
		symbol: normalizedRate.includes("%") ? "%" : "",
	};
}
