import type { CtaProps } from "@/shared/ui/Cta/Cta.type";

export type CardProps = {
	img: {
		src: string;
		alt: string;
	};
	title: string;
	description: string;
	ctaProps: CtaProps;
	className?: string;
	date: string;
	dateIso?: string;
	tag: string;
};
