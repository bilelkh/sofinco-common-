import type { CtaProps } from "@shared/ui/Cta/Cta.type";
import type { VideoBlockProps } from "../../VideoBlock";
import type { TitleProps } from "@shared/ui/Title/Title.type";
import type { ScrollStepsItem } from "@common/ScrollSteps/scrollSteps.types";

/**
 * "Comment ça marche" — bloc d'assemblage.
 *
 * Le composant ne porte aucune logique d'étapes propre : il agence des briques
 * autonomes du DS (en-tête, ScrollSteps, CTA, VideoBlock). L'animation des
 * étapes (hover desktop / scroll "roulette" mobile, R.G. 3) est entièrement
 * déléguée à <ScrollSteps>.
 */
export interface HowItWorksProps {
	/**
	 * Titre H2 du bloc — forme `TitleProps` (DS sofinco-react).
	 *
	 *   - `children` = texte (jcr:title côté Jahia)
	 *   - `as`       = niveau HTML sémantique (SEO/a11y) — contribuable via
	 *                  le mixin `sofmix:headingStyle.titleLevel`
	 *   - `visualStyle` = apparence visuelle, peut différer de `as`
	 *
	 * Taille et couleur sont figées (R.G. 2) : seuls les attributs du contenu
	 * (bold, italic…) restent contribuables. Optionnel : si `undefined`, l'en-tête
	 * est omis.
	 */
	title?: TitleProps;
	/** Sous-titre (p) affiché sous le titre. */
	subtitle?: string;
	/**
	 * Étapes du parcours, transmises telles quelles à <ScrollSteps>
	 * (pictogramme de numérotation `badge`, titre, description, image).
	 */
	steps: ScrollStepsItem[];
	/**
	 * CTA optionnel affiché entre le parcours d'étapes et la vidéo.
	 */
	cta?: CtaProps;
	/**
	 * Bloc vidéo optionnel affiché en bas (R.G. 4). Il porte son propre titre
	 * et sa propre retranscription — voir <VideoBlock>.
	 */
	video?: VideoBlockProps;
	/** Desktop : image à gauche (défaut) ou à droite. Sans effet en mobile (image en haut). */
	imagePosition?: "left" | "right";
}
