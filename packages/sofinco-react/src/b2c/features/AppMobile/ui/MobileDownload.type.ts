export interface MobileDownloadCtaProps {
	mobileCtaHrefIos?: string;
	mobileCtaHrefAndroid?: string;
	/**
	 * Destination déjà résolue par l'appelant. Prioritaire sur `mobileCtaHrefIos` /
	 * `mobileCtaHrefAndroid` : le CTA la sert telle quelle, sans refaire l'arbitrage iOS /
	 * Android. `AppMobile` s'en sert parce qu'il a DÉJÀ dû résoudre le href pour choisir entre
	 * QR code et CTA — sans ça l'arbitrage aurait lieu deux fois par rendu.
	 */
	href?: string;
	className?: string;
	label?: string;
}
