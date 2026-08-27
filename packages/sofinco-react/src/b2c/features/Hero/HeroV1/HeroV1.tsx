import type { HeroV1Props } from "@b2c/features/Hero/HeroV1/HeroV1.type";
import styles from "@b2c/features/Hero/HeroV1/HeroV1.module.css";
import HeroImg from "@b2c/features/Hero/ui/HeroImg/HeroImg";
import HeroSimulatorSticky from "@b2c/features/Hero/ui/HeroSimulatorSticky/HeroSimulatorSticky";
import { HeroOverlay } from "@b2c/features/Hero/ui/HeroOverlay/HeroOverlay";
import { HeroContentMain } from "@b2c/features/Hero/ui/HeroContent/HeroContentMain/HeroContentMain";
import { buildViewPromotionAttr } from "@b2c/features/Hero/promotionTracking";
import { useHeaderHeightVar } from "@shared/hooks/useHeaderHeightVar";

const HeroV1 = ({
	title,
	subtitle,
	img,
	args,
	simulator,
	className,
	tracking,
}: HeroV1Props) => {
	useHeaderHeightVar();

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
			<HeroContentMain title={title} subtitle={subtitle} args={args} simulator={simulator} />
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

export { HeroV1 };
export default HeroV1;
