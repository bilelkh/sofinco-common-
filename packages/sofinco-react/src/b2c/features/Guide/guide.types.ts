export interface GuideLink {
	id: string;
	label: string;
	url: string;
}

export interface GuideCategory {
	id: string;
	title: string;
	imageAlt?: string;
	/** Visuel carré (140x140) affiché à partir de 900px, à côté des liens. */
	imageUrl: string;
	/**
	 * Visuel large (279x80) affiché en dessous de 900px, où la tuile devient une
	 * bannière. Optionnel : sans lui, `imageUrl` est utilisé aux deux tailles et
	 * l'illustration carrée ne remplit qu'une fraction de la bannière.
	 */
	imageUrlMobile?: string;
	links: GuideLink[];
}

export interface GuideProps {
	title: string;
	titleSize?: "h2" | "h3";
	ctaLabel?: string;
	ctaUrl?: string;
	categories: GuideCategory[];
}
