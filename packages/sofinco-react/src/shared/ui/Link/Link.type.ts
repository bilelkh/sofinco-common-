import type { MouseEventHandler } from "react";
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
	onClick?: MouseEventHandler<HTMLAnchorElement>;
	/**
	 * Referme le menu mobile au clic. À poser sur les liens qui n'emmènent NULLE PART :
	 * un lien de navigation referme le menu en changeant de page, celui-ci non — il ouvre
	 * une surface par-dessus, et le menu resterait ouvert derrière.
	 *
	 * Sérialisable : les props du menu traversent la frontière serveur → îlot en JSON, donc
	 * un drapeau et non un rappel de fonction.
	 */
	closesMenu?: boolean;
};
