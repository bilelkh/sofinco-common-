import type { BreadcrumbLayoutProps } from "@shared/ui/Breadcrumb/breadcrumb.type";
import type { CtaProps } from "@shared/ui/Cta/Cta.type";
import type { ImageSource } from "@shared/ui/Image/Image.type";

/**
 * Visuel plein cadre du bandeau.
 *
 * Image de fond, donc décorative : le composant émet `alt=""` + `aria-hidden` et ne
 * demande aucun texte alternatif. Le message est porté par le titre, jamais par la photo.
 */
export interface ImageHeroImage {
	/** URL du visuel (rendition Jahia, WebP de préférence). */
	src: string;
	/**
	 * Sources art-directed (recadrage mobile, format WebP…), transmises telles quelles au
	 * `<picture>` de la primitive `Image`. Sans `sources`, un simple `<img>` est rendu.
	 */
	sources?: ImageSource[];
	/**
	 * Dimensions intrinsèques, pour réserver la place avant décodage (CLS). À défaut, le
	 * gabarit de la maquette (1440 × 741) est transmis.
	 */
	width?: number;
	height?: number;
}

export interface ImageHeroProps {
	/**
	 * Titre du bandeau — contribué dans Jahia. Chaîne plutôt que `ReactNode` : `Title`
	 * sait y rendre les renvois de notes de bas de page (`⁽¹⁾`).
	 */
	title: string;
	/** Accroche sous le titre — contribuée dans Jahia. */
	subtitle?: string;
	/**
	 * Niveau du titre. `h1` par défaut : le bandeau ouvre la page. À passer en `h2`
	 * seulement si la page porte déjà son `h1` ailleurs.
	 */
	titleAs?: "h1" | "h2";
	/** Visuel plein cadre, derrière le texte. */
	image: ImageHeroImage;
	/**
	 * Bouton sous l'accroche — réutilise le `Cta` partagé (variante `accent`, flèche à
	 * droite). Sans `label` ou sans `href`, aucun bouton n'est rendu.
	 */
	cta?: Pick<CtaProps, "label" | "href" | "target" | "onClick" | "tracking">;
	/**
	 * Fil d'Ariane posé en haut du bandeau — l'objet retourné par
	 * `buildBreadcrumbLayoutProps()` côté template. Le `theme` transmis est ignoré : le
	 * texte est toujours clair, le bandeau étant voilé de sombre.
	 */
	breadcrumb?: BreadcrumbLayoutProps;
	/**
	 * Voile noir à 40 % sur la photo (défaut `true`). C'est lui qui garantit le contraste
	 * du texte blanc quel que soit le visuel contribué ; à ne couper que sur une photo
	 * déjà sombre.
	 */
	overlay?: boolean;
	/** Classe additionnelle appliquée à la `<section>`. */
	className?: string;
}
