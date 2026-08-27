import type { CtaTracking } from "@shared/ui/Cta/Cta.type";
import type { SectionHeadingProps } from "@shared/ui/SectionHeading/SectionHeading.type";
import { type PillProps } from "@/shared/ui/Pill";

export type SectionCarteItem = PillProps & { id: string };

export interface SectionCarteProps {
	/** Main centered heading of the section. */
	title: string;
	/** Intro paragraph rendered below the heading. */
	subtitle?: string;
	/** Optional eyebrow / uptitle rendered above the heading. */
	eyebrow?: SectionHeadingProps["eyebrow"];
	/**
	 * Semantic level of the section heading.
	 * @defaultValue "h2"
	 */
	titleAs?: SectionHeadingProps["titleAs"];
	/** Visual heading style, independent from `titleAs`. */
	visualStyle?: SectionHeadingProps["visualStyle"];
	/**
	 * Horizontal alignment of the heading block.
	 * @defaultValue "center"
	 */
	align?: SectionHeadingProps["align"];
	/** Portrait image (person holding the card). */
	imageUrl: string;
	/** Alt text for the image. */
	imageAlt?: string;
	/** Title of the right-hand text block. */
	contentTitle: string;
	/** Descriptive paragraph of the right-hand text block. */
	contentText: string;
	/** Checklist of benefits rendered as capsule pills. */
	items: SectionCarteItem[];
	/** CTA label. */
	ctaLabel: string;
	/** CTA destination URL. */
	ctaUrl: string;
	/** Optional tracking payload forwarded to the CTA. */
	ctaTracking?: CtaTracking;
}
