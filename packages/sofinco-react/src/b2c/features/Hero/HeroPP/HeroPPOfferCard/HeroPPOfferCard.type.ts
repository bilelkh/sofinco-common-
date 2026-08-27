export type HeroPPOfferCardProps = {
	infoBlock?: {
		rate: string;
		rateLabel: string;
		details: string;
	};
	imgSrc: string;
	/**
	 * Crop mobile art-directe, servi sous 768px (token `--small-down`).
	 * Optionnel : sans lui, `imgSrc` est utilise a toutes les largeurs.
	 */
	imgSrcMobile?: string;
};
