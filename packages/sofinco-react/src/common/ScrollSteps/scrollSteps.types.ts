import type { IconKey } from "@/shared/ui/svg";

export interface ScrollStepsItem {
	id: string;
	badge?: IconKey | number;
	title: string;
	description: string;
	imageUrl: string;
	/**
	 * Texte alternatif de l'image. Optionnel : dans le stack animé "live"
	 * l'image est décorative (`aria-hidden` + `alt=""`), mais les vues d'édition
	 * (ex. carte contributeur Jahia) l'utilisent pour un aperçu accessible.
	 */
	imageAlt?: string;
}

export interface ScrollStepsProps {
	items: ScrollStepsItem[];
	/** Desktop : image à gauche (défaut) ou à droite. Sans effet en mobile (image en haut). */
	imagePosition?: "left" | "right";
}
