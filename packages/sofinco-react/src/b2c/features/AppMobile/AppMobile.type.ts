import type { SectionHeadingProps } from "@shared/ui/SectionHeading/SectionHeading.type";
import type { TitleTag } from "@shared/ui/Title/Title.type";

export interface AppMobileCard {
	/** Card id (also used as its index in maps). */
	id: number;
	/** Main text displayed in the card. */
	label: string;
	/**
	 * Balise du libellé de carte. L'apparence reste celle du composant ; seule la place dans
	 * le plan de la page est négociable. `h3` par défaut — le niveau codé en dur jusqu'ici.
	 */
	labelAs?: TitleTag;
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
	sectionHeadingProps?: SectionHeadingProps;
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
