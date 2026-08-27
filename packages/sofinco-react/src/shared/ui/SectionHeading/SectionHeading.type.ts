import type { TitleProps } from "../Title/Title.type";

export type SectionHeadingProps = {
	/** Main heading text. Optional so the block can render subtitle/eyebrow alone. */
	title?: React.ReactNode;
	/** Optional introductory text rendered below the title. */
	subtitle?: React.ReactNode;
	/** Optional eyebrow / uptitle rendered above the title. */
	eyebrow?: React.ReactNode;
	/** Semantic heading level (passed to Title). */
	titleAs?: TitleProps["as"];
	/** Visual heading style, independent from `as` (passed to Title). */
	visualStyle?: TitleProps["visualStyle"];
	/** Color variant applied to both title and subtitle. */
	variant?: "dark" | "white";
	/** Horizontal alignment of the block. */
	align?: "start" | "center";
	/** Id set on the title, for `aria-labelledby` on the parent section. */
	id?: string;
	/** Class applied to the wrapper. */
	className?: string;
	/** Forwarded to the root `<header>` element (e.g. for GSAP/scroll animations on the whole heading). */
	ref?: React.Ref<HTMLElement>;
	/** Escape hatch to override the title typography (bespoke sections). */
	titleClassName?: string;
	/** Optional children to render inside the heading. */
	children?: React.ReactNode;

};
