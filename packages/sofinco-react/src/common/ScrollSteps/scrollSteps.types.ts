import type { IconKey } from "@/shared/ui/svg";
import type { TitleTag } from "@/shared/ui/Title/Title.type";

export interface ScrollStepsItem {
	id: string;
	badge?: IconKey | number;
	title: string;
	/**
	 * Balise du titre d'étape.
	 *
	 * `p` par défaut. Le rendu live n'a jamais posé de TITRE ici — c'était un `<span>` ; seul
	 * l'aperçu d'édition Jahia affichait un `<h4>`, que Google ne voit pas. Le passage à `<p>`
	 * est visuellement neutre et donne une valeur offrable dans la choicelist du contributeur,
	 * qui peut alors faire remonter les étapes dans le plan de page.
	 */
	titleAs?: TitleTag;
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
