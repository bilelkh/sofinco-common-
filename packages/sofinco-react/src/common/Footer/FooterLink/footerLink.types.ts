import type { LinkTracking } from "@shared/ui/Link/Link.type";

export interface FooterLinkProps {
	id: string;
	label: string;
	href: string;
	target?: "_self" | "_blank" | string;
	ariaLabel?: string;
	size?: "small" | "medium";
	tracking?: LinkTracking;
	/**
	 * Entrée « Gérer mes cookies ». `FooterLink` la rend avec un `<button>` au lieu d'un
	 * `<a>` : elle déclenche une action, elle ne navigue pas, et un `<a>` promettrait aux
	 * lecteurs d'écran une navigation qui n'aura jamais lieu.
	 *
	 * Posée par `footerLink.mapping` quand `resolveCtaMode` renvoie `consent`. Le `href`
	 * reste requis côté type mais n'atteint pas le DOM dans ce mode — cf. `#lib/cta`.
	 */
	isConsent?: boolean;
}
