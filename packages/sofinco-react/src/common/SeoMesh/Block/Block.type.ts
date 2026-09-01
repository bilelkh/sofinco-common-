import type { LinkProps } from "@shared/ui/Link/Link.type";
import type { CtaProps } from "@/shared/ui/Cta/Cta.type";
import type { HeadingLevel, TitleTag } from "@/shared/ui/Title/Title.type";

/** Une colonne de liens du bloc de maillage. */
export type SeoMeshSection = {
	title: string;
	/** Niveau contribué via `subBlockLevel` (spnt:seoLinksSubBlock). */
	titleAs?: TitleTag;
	links: LinkProps[];
};

export type BlockProps = {
	id: string;
	ctaProps: CtaProps;
	title: string;
	/**
	 * Niveau du titre de bloc, contribué via `blockTitleLevel` (spnt:seoLinksBlock).
	 * Le rendu LIVE le jetait et codait `as="h2"` en dur, alors que l'aperçu d'édition le
	 * respectait : le contributeur voyait son choix appliqué puis ignoré en production.
	 */
	titleAs?: TitleTag;
	titleStyle?: HeadingLevel;
	linkSectionLeft?: SeoMeshSection;
	linkSectionRight?: SeoMeshSection;
	className?: string;
};
