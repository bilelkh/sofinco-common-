import type { IconKey } from "@shared/ui/svg";

export type CtaTracking = {
	event?: string;
	[key: string]: unknown;
};

export type CtaProps = {
	type?: "button" | "submit" | "reset";
	variant?:
		| "primary"
		| "secondary"
		| "accent"
		| "ghost"
		| "danger"
		| "outlined"
		| "app-badge"
		| "campaign"
		| "underlined";
	size?: "small" | "medium" | "large";
	label?: string;
	iconOnly?: boolean;
	ariaLabel?: string;
	iconLeft?: IconKey;
	iconRight?: IconKey;
	isLoading?: boolean;
	isDisabled?: boolean;
	className?: string;
	target?: React.HTMLAttributeAnchorTarget;
	href?: string;
	onClick?: (e: React.MouseEvent<HTMLElement>) => void;
	tracking?: CtaTracking;
	ctaSection?: string;
	props?: React.ButtonHTMLAttributes<HTMLButtonElement> &
		React.AnchorHTMLAttributes<HTMLAnchorElement>;
};
