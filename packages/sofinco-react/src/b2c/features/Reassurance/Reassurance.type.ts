import type { LinkProps } from "@shared/ui/Link/Link.type";

export interface ReassuranceItem {
	id: number | string;
	icon?: string;
	iconAlt?: string;
	title: string;
	text?: string;
	link?: LinkProps;
}

export interface ReassuranceProps {
	title: string;
	subtitle?: string;
	items: ReassuranceItem[];
	className?: string;
}
