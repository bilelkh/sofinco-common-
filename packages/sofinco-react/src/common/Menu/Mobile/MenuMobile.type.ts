import type { MenuProps } from "../Menu.type";
import type { CtaProps } from "@shared/ui/Cta/Cta.type";
import type { LinkProps } from "@shared/ui/Link/Link.type";

export type MenuMobileProps = Omit<MenuProps, "logo"> & {
	ctaProps?: CtaProps;
	links: Array<LinkProps>;
	className?: string;
};
