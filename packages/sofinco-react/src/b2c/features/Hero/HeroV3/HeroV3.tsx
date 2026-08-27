import type { HeroV3Props } from "@b2c/features/Hero/HeroV3/HeroV3.type";
import styles from "@b2c/features/Hero/HeroV3/HeroV3.module.css";
import HeroImg from "@b2c/features/Hero/ui/HeroImg/HeroImg";
import HeroSimulatorSticky from "@b2c/features/Hero/ui/HeroSimulatorSticky/HeroSimulatorSticky";
import { HeroOverlay } from "@b2c/features/Hero/ui/HeroOverlay/HeroOverlay";
import HeroContentMainBigRate from "@b2c/features/Hero/ui/HeroContent/HeroContentMainBigRate/HeroContentMainBigRate";
import {
	buildViewPromotionAttr,
	buildSelectPromotionEvent,
} from "@b2c/features/Hero/promotionTracking";
import { useHeaderHeightVar } from "@shared/hooks/useHeaderHeightVar";

const HeroV3 = ({
	title,
	subtitle,
	img,
	hookValue,
	hookDateLabel,
	cta,
	simulator,
	className,
	tracking,
	badgeLabel,
}: HeroV3Props) => {
	useHeaderHeightVar();

	const selectPromotionEvent = buildSelectPromotionEvent(tracking);
	const ctaWithTracking =
		cta && selectPromotionEvent ? { ...cta, tracking: selectPromotionEvent } : cta;
	const stickyCta = simulator?.cta;
	const stickyLabel =
		typeof stickyCta?.label === "string" ? stickyCta.label : "Je découvre mes conditions";
	const stickyHref = stickyCta?.href;
	const stickyTarget = stickyCta?.target;
	const stickyVariant = stickyCta?.variant;

	return (
		<section
			className={`${styles.hero} ${className ?? ""}`}
			data-hero-root="true"
			data-tracking-view={buildViewPromotionAttr(tracking)}
		>
			<HeroImg {...img} />
			<HeroOverlay />

			<HeroContentMainBigRate
				title={title}
				subtitle={subtitle}
				hookValue={hookValue}
				hookDateLabel={hookDateLabel}
				cta={ctaWithTracking}
				simulator={simulator}
				badgeLabel={badgeLabel}
			/>

			{simulator && stickyHref && (
				<HeroSimulatorSticky
					buttonLabel={stickyLabel}
					href={stickyHref}
					target={stickyTarget}
					variant={stickyVariant}
				/>
			)}
		</section>
	);
};

export { HeroV3 };
export default HeroV3;
