export interface QrCodeProps {
	src: string;
	text?: string;
	className?: string;
	/**
	 * Force l'affichage de la vignette quelle que soit la largeur du viewport.
	 *
	 * Réservé aux vues d'ÉDITION : dans jContent l'aperçu vit dans une iframe souvent plus
	 * étroite que le seuil d'affichage, et un contributeur qui vient de choisir une image doit
	 * pouvoir la vérifier. À ne pas utiliser sur les vues servies au visiteur, où c'est le
	 * média CSS qui décide.
	 */
	alwaysVisible?: boolean;
}

export interface QrMobileProps {
	iosUrl?: string;
	androidUrl?: string;
	fallbackUrl?: string;
	ctaLabelHeader?: string;
	ctaLabelFooter?: string;
}

export interface QrProps extends QrCodeProps, QrMobileProps {
	isActive: boolean;
}
