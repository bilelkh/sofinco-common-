export interface AppMobileCard {
	/** Card id (also used as its index in maps). */
	id: number;
	/** Main text displayed in the card. */
	label: string;
	/** Secondary text displayed below the label. */
	labelComplement: string;
	/** Optional card icon URL (e.g. "×3" badge). */
	picto?: string;
}

export interface AppMobileProps {
	/** URL of the icon/logo displayed at the top of the block (e.g. Sofinco icon). */
	picto?: string;
	/** Configurable background color for the section. */
	backgroundColor: string;
	/** Main title. */
	title: string;
	/** Subtitle / introductory text. */
	subtitle: string;
	/** Four floating argument cards around the central image. */
	cards: AppMobileCard[];
	/** URL of the central image (phone mockup). */
	img: string;
	/** Optional QR code URL displayed above the download CTA. */
	imgQrCode?: string;
	/** iOS App Store URL, used with priority on iPhone/iPad. */
	mobileCtaHrefIos?: string;
	/** Android Play Store URL, used with priority on Android. */
	mobileCtaHrefAndroid?: string;
	/** Additional CSS class applied to the root section. */
	className?: string;
}
