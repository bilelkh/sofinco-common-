import type { HTMLAttributeAnchorTarget } from "react";
import type { CtaProps } from "@shared/ui/Cta/Cta.type";

export type HeroSimulatorStickyProps = {
	buttonLabel: string;
	href: string;
	target?: HTMLAttributeAnchorTarget;
	variant?: CtaProps["variant"];
};
