import type { IconKey } from "@shared/ui/svg";

export type LinkTracking = {
	event?: string;
	[key: string]: unknown;
};

export type LinkProps = {
	id?: string;
	href: string;
	label?: string;
	className?: string;
	theme?: "light" | "dark";
	iconVariant?: "primary" | "accent" | "danger";
	isExternal?: boolean;
	iconLeft?: IconKey;
	iconRight?: IconKey;
	tracking?: LinkTracking;
};
