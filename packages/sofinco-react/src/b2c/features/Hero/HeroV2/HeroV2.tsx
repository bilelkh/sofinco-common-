import type { HeroV2Props } from "@b2c/features/Hero/HeroV2/HeroV2.type";
import styles from "@b2c/features/Hero/HeroV2/HeroV2.module.css";
import HeroImg from "@b2c/features/Hero/ui/HeroImg/HeroImg.jsx";
import HeroSimulatorSticky from "@b2c/features/Hero/ui/HeroSimulatorSticky/HeroSimulatorSticky.jsx";
import { HeroOverlay } from "@b2c/features/Hero/ui/HeroOverlay/HeroOverlay";
import { HeroContentMain } from "@b2c/features/Hero/ui/HeroContent/HeroContentMain/HeroContentMain";
import HeroOfferCard from "@b2c/features/Hero/ui/HeroOfferCard/HeroOfferCard.tsx";
import { buildViewPromotionAttr } from "@b2c/features/Hero/promotionTracking";
import { useHeaderHeightVar } from "@shared/hooks/useHeaderHeightVar";

const HeroV2 = ({
	title,
	subtitle,
	img,
	offerTitleBadge,
	offerBadge,
	offerRate,
	offerRateLabel,
	offerRateLabelBis,
	offerAmount,
	offerLegalText,
	cta,
	simulator,
	className,
	tracking,
}: HeroV2Props) => {
	useHeaderHeightVar();

	const stickyCta = simulator?.cta;
	const stickyLabel =
		typeof stickyCta?.label === "string" ? stickyCta.label : "Je découvre mes conditions";
	const stickyHref = stickyCta?.href;
	const stickyTarget = stickyCta?.target;
	const stickyVariant = stickyCta?.variant;
	// add clsx
	return (
		<div
			className={`${styles.heroWrapper} ${className ?? ""}`}
			data-tracking-view={buildViewPromotionAttr(tracking)}
		>
			<section className={styles.hero} data-hero-root="true">
				<HeroImg {...img} />
				<HeroOverlay />
				<HeroContentMain title={title} subtitle={subtitle} simulator={simulator} />
				{simulator && stickyHref && (
					<HeroSimulatorSticky
						buttonLabel={stickyLabel}
						href={stickyHref}
						target={stickyTarget}
						variant={stickyVariant}
					/>
				)}
			</section>
			<HeroOfferCard
				titleBadge={offerTitleBadge}
				badge={offerBadge}
				rate={offerRate}
				rateLabel={offerRateLabel}
				rateLabelBis={offerRateLabelBis}
				amount={offerAmount}
				legalText={offerLegalText}
				cta={cta}
			/>
		</div>
	);
};

export { HeroV2 };
export default HeroV2;
