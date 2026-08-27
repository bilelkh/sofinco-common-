import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { HeroProps } from "./hero.types";
import type {
	HeroProps as HeroClientProps,
	ArgumentItem,
	PromotionTracking,
	HeroImgProps,
} from "sofinco-react";

import { toHeroVariant } from "./hero.types";
import { str, strLimit, imgUrl, vidUrl } from "#lib/jcr";
import { addCacheDependency } from "#lib/renderContext";
import { getCtaProps } from "#lib/cta";
import { extractPromotionTracking } from "#lib/promotionTracking";

/** Fields every hero variant carries, before per-variant data is merged in. */
type HeroBaseData = {
	title: string;
	subtitle: string;
	tracking?: PromotionTracking;
};

type HeroVariantMapper = (node: JCRNodeWrapper, base: HeroBaseData) => object;

/**
 * A render target's builder for each variant. Two targets exist:
 *  - `SERVER` — edit mode, feeding the local `views/HeroV*.tsx`.
 *  - `CLIENT` — live / preview, feeding the sofinco-react `<Hero>` design system.
 *
 * Most variants differ between the two targets (V1 arguments, V2 offer field names,
 * V4 video shape); V3's shape is identical, so both targets reuse the same builder.
 */
type HeroTarget = Record<"v1" | "v2" | "v3" | "v4", HeroVariantMapper>;

// ── Field extractors ───────────────────────────────────────────────────────

/**
 * Les quatre champs image sont optionnels dans le CND et `imgUrl` renvoie ""
 * pour une reference absente. Le repli est donc **bidirectionnel** : chaque
 * breakpoint retombe sur la premiere source reellement contribuee, dans les
 * deux sens. Sans cela un hero sans `imageDesktop` emet `<source srcSet="">`
 * et `<img src="">` — l'element LCP rendu vide.
 *
 * `primary` reste "" si aucune des trois n'est contribuee : les vues doivent
 * alors ne rien rendre plutot que de propager un `src` vide.
 */
function extractImageProps(node: JCRNodeWrapper): { img: HeroImgProps } {
	const desktop = imgUrl(node, "imageDesktop");
	const tablet = imgUrl(node, "imageTablet");
	const mobile = imgUrl(node, "imageMobile");
	const primary = desktop || tablet || mobile;
	return {
		img: {
			lowSrc: imgUrl(node, "imageBeforeAnim"),
			desktopSrc: primary,
			tabletSrc: tablet || primary,
			mobileSrc: mobile || primary,
		},
	};
}

function extractHeroArguments(node: JCRNodeWrapper): ArgumentItem[] {
	// Bypass des helpers pour early-break après 3 items — on ré-implémente
	// la déclaration de deps cache pour ne pas régresser.
	try {
		addCacheDependency({ flushOnPathMatchingRegexp: node.getPath() + "/.*" });
	} catch {
		/* ignore */
	}
	const args: ArgumentItem[] = [];
	const argNodes = node.getNodes();
	while (argNodes.hasNext()) {
		const argNode = argNodes.nextNode() as JCRNodeWrapper;
		if (argNode.getPrimaryNodeTypeName() === "sofnt:heroArgument") {
			addCacheDependency({ node: argNode });
			args.push({ id: argNode.getIdentifier(), label: strLimit(argNode, "jcr:title", 36) });
			if (args.length === 3) break;
		}
	}
	return args;
}

function baseData(node: JCRNodeWrapper): HeroBaseData {
	return {
		title: str(node, "jcr:title"),
		subtitle: str(node, "subtitle"),
		tracking: extractPromotionTracking(node),
	};
}

// ── V1 — args only on the live target ──────────────────────────────────────

function dataV1(node: JCRNodeWrapper, base: HeroBaseData) {
	return { ...base, ...extractImageProps(node), variant: "v1" };
}

function dataV1WithArgs(node: JCRNodeWrapper, base: HeroBaseData) {
	return { ...dataV1(node, base), args: extractHeroArguments(node) };
}

// ── V2 — single shape: both targets render the sofinco-react HeroOfferCard ──

function v2Core(node: JCRNodeWrapper, base: HeroBaseData) {
	return {
		...base,
		...extractImageProps(node),
		variant: "v2",
		offerRate: str(node, "offerRate"),
		offerRateLabel: str(node, "offerRateLabel"),
		offerRateLabelBis: str(node, "offerRateLabelBis"),
		offerAmount: str(node, "offerAmount"),
		cta: getCtaProps(node, "hero-v2-cta"),
	};
}

function dataV2(node: JCRNodeWrapper, base: HeroBaseData) {
	return {
		...v2Core(node, base),
		offerTitleBadge: str(node, "offerTitleBadge"),
		offerBadge: str(node, "offerLabel"),
		offerLegalText: str(node, "mentionsLegales"),
	};
}

// ── V3 — identical shape on both targets ───────────────────────────────────

function dataV3(node: JCRNodeWrapper, base: HeroBaseData) {
	return {
		...base,
		...extractImageProps(node),
		variant: "v3",
		hookValue: str(node, "hookValue"),
		hookDateLabel: str(node, "hookDateLabel"),
		badgeLabel: str(node, "badgeLabel"),
		cta: getCtaProps(node, "hero-v3-cta"),
	};
}

// ── V4 — flat video URLs (server views) vs `video {}` object (design system) ─

function dataV4Server(node: JCRNodeWrapper, base: HeroBaseData) {
	return {
		...base,
		variant: "v4",
		videoUrl: vidUrl(node, "videoRef"),
		videoMobileUrl: vidUrl(node, "videoMobileRef"),
		videoPosterUrl: imgUrl(node, "videoPosterRef"),
		cta: getCtaProps(node, "hero-v4-cta", "campaign"),
	};
}

function dataV4Client(node: JCRNodeWrapper, base: HeroBaseData) {
	return {
		...base,
		variant: "v4",
		video: {
			srcDesktop: vidUrl(node, "videoRef"),
			srcMobile: vidUrl(node, "videoMobileRef") || undefined,
			poster: imgUrl(node, "videoPosterRef") || undefined,
		},
		campaignCta: getCtaProps(node, "hero-v4-cta", "campaign") ?? undefined,
	};
}

// ── Targets + shared dispatcher ────────────────────────────────────────────

const SERVER_TARGET: HeroTarget = {
	v1: dataV1,
	v2: dataV2,
	v3: dataV3,
	v4: dataV4Server,
};

const CLIENT_TARGET: HeroTarget = {
	v1: dataV1WithArgs,
	v2: dataV2,
	v3: dataV3,
	v4: dataV4Client,
};

function mapHero(node: JCRNodeWrapper, target: HeroTarget): unknown {
	const base = baseData(node);
	return target[toHeroVariant(str(node, "variant"))](node, base);
}

/** Live / preview rendering → sofinco-react design-system `<Hero>`. */
export function mapHeroProps(node: JCRNodeWrapper): HeroClientProps {
	return mapHero(node, CLIENT_TARGET) as HeroClientProps;
}

/** Edit mode → local server-rendered hero views. */
export function mapHeroPropsServer(node: JCRNodeWrapper): HeroProps {
	return mapHero(node, SERVER_TARGET) as HeroProps;
}
