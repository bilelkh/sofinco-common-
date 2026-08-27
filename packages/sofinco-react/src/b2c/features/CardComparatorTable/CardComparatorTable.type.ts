import type { CtaProps } from "@shared/ui/Cta/Cta.type";

export type ComparatorFeature = {
	id: string;
	label: string;
	included?: boolean;
};

export type ComparatorCardProps = {
	id: string;
	image: string;
	title: string;
	description: string;
	features: ComparatorFeature[];
	cta: {
		label: string;
		href: string;
		target?: "_self" | "_blank";
		variant?: CtaProps["variant"];
		size?: CtaProps["size"];
		ctaSection?: string;
	};
	badgeLabel?: string;
	className?: string;
};

export type CardComparatorTableProps = {
	title?: string;
	subtitle?: string;
	items: ComparatorCardProps[];
	className?: string;
};
