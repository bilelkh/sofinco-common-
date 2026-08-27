import type { LinkTracking } from "@shared/ui/Link/Link.type";

/**
 * Teinte d'une carte témoignage.
 *
 * La maquette alterne fond blanc / fond navy une carte sur deux — d'où le calcul par
 * défaut à partir de l'index (rang impair = `dark`). `tone` sur l'item permet à la
 * contribution Jahia de forcer une teinte quand l'ordre des témoignages change.
 */
export type TestimonialTone = "light" | "dark";

/** Lien « Lire le témoignage » d'une carte. */
export interface TestimonialLink {
	label: string;
	href: string;
	/** Ouvre dans un nouvel onglet (`rel="noopener noreferrer"`). */
	isExternal?: boolean;
	tracking?: LinkTracking;
}

/**
 * Un témoignage client, contribué dans Jahia.
 *
 * Le portrait est une image de contenu (rendition Jahia) : le composant ne fournit
 * aucune illustration par défaut, la carte se contente d'omettre la vignette.
 */
export interface SocialProofTestimonial {
	/** Identifiant stable — sert de clé React. */
	id: string;
	/** Corps du témoignage, guillemets français compris (contribué tel quel). */
	quote: string;
	/** Nom de l'auteur, affiché en Cutta. */
	authorName: string;
	/** Fonction et société de l'auteur. */
	authorRole?: string;
	/** URL du portrait (72 × 72, recadré en cercle). */
	avatarSrc?: string;
	/**
	 * Texte alternatif du portrait. Omis, la vignette est rendue décorative
	 * (`alt=""` + `aria-hidden`) : le nom de l'auteur la suit immédiatement dans le
	 * flux, la décrire reviendrait à le doubler.
	 */
	avatarAlt?: string;
	link?: TestimonialLink;
	/** Force la teinte de la carte au lieu de l'alternance automatique. */
	tone?: TestimonialTone;
}

/** Libellés d'accessibilité du carrousel. */
export interface SocialProofA11y {
	/** Nom accessible de la section et du conteneur Swiper. */
	containerLabel?: string;
	prevSlideLabel?: string;
	nextSlideLabel?: string;
	firstSlideLabel?: string;
	lastSlideLabel?: string;
	/** `{{index}}` et `{{slidesLength}}` sont remplacés par Swiper. */
	slideLabel?: string;
}

export interface SocialProofProps {
	/**
	 * Titre du bloc (rendu en H2). Contribué dans Jahia ; ni la taille ni la couleur
	 * ne sont paramétrables.
	 */
	title: string;
	/** Accroche affichée sous le titre. */
	subtitle?: string;
	/** Témoignages du carrousel. */
	testimonials: SocialProofTestimonial[];
	a11y?: SocialProofA11y;
	/** Classe additionnelle appliquée à la `<section>`. */
	className?: string;
}

export interface TestimonialCardProps
	extends Omit<SocialProofTestimonial, "id" | "tone"> {
	tone?: TestimonialTone;
	className?: string;
}
