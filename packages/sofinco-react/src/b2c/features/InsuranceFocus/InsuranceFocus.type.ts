import type { TitleProps } from "@shared/ui/Title/Title.type";
import type { CtaProps } from "@shared/ui/Cta/Cta.type";

export interface InsuranceFocusProps {
	/** Main title — required, H2 by default, stylable via Jahia's
	 * `sofmix:headingStyle`. Names the `<section>` landmark via `aria-labelledby`. */
	title: TitleProps;
	/** Descriptive paragraph — required. Rendered below the title. */
	description: string;
	/** Illustrative image (lifebuoy, safe, app screen…) — required on the CND side.
	 * Empty allowed on the DS side to support transient states (unpublished image). */
	imageSrc: string;
	/** Image alt text — empty allowed (decorative image).
	 * @defaultValue "" */
	imageAlt?: string;
	/**
	 * Main CTA — required (`sofmix:cta`).
	 */
	cta: CtaProps;
	className?: string;
}
