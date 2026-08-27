import type { CtaProps } from "sofinco-react";
import type { ArgumentItem, PromotionTracking } from "sofinco-react";
import type { HeroImgProps } from "sofinco-react";

export type HeroVariant = "v1" | "v2" | "v3" | "v4";
const VALID: readonly HeroVariant[] = ["v1", "v2", "v3", "v4"];

export function toHeroVariant(v: string): HeroVariant {
	return (VALID as readonly string[]).includes(v) ? (v as HeroVariant) : "v1";
}

export interface HeroBaseProps {
	variant: HeroVariant;
	title: string;
	subtitle: string;
	tracking?: PromotionTracking;
}

export interface HeroV1Props extends HeroBaseProps {
	variant: "v1";
	img: HeroImgProps;
	args: ArgumentItem[];
}

export interface HeroV2Props extends HeroBaseProps {
	variant: "v2";
	img: HeroImgProps;
	offerTitleBadge: string;
	offerBadge: string;
	offerRate: string;
	offerRateLabel: string;
	offerRateLabelBis: string;
	offerAmount: string;
	offerLegalText: string;
	cta: CtaProps | null;
}

export interface HeroV3Props extends HeroBaseProps {
	variant: "v3";
	img: HeroImgProps;
	hookValue: string;
	hookDateLabel: string;
	badgeLabel: string;
	cta: CtaProps | null;
}

export interface HeroV4Props extends HeroBaseProps {
	variant: "v4";
	videoUrl: string;
	videoMobileUrl: string;
	videoPosterUrl: string;
	cta: CtaProps | null;
}

export type HeroProps = HeroV1Props | HeroV2Props | HeroV3Props | HeroV4Props;
