import type { LinkProps } from "@shared/ui/Link/Link.type";
import type { CtaProps } from "@/shared/ui/Cta/Cta.type";

export type BlockProps = {
	id: string;
	ctaProps: CtaProps;
	title: string;
	linkSectionLeft?: {
		title: string;
		links: LinkProps[];
	};
	linkSectionRight?: {
		title: string;
		links: LinkProps[];
	};
	className?: string;
};
