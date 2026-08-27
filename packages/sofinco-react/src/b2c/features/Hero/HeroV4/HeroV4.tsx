import type { HeroV4Props } from "@b2c/features/Hero/HeroV4/HeroV4.type";
import styles from "@b2c/features/Hero/HeroV4/HeroV4.module.css";
import HeroVideo from "@b2c/features/Hero/ui/HeroVideo/HeroVideo.jsx";
import HeroSimulatorSticky from "@b2c/features/Hero/ui/HeroSimulatorSticky/HeroSimulatorSticky.jsx";
import { HeroOverlay } from "@b2c/features/Hero/ui/HeroOverlay/HeroOverlay";
import { HeroContentMainVideo } from "@b2c/features/Hero/ui/HeroContent/HeroContentMainVideo/HeroContentMainVideo";
import HeroCampaignCta from "@b2c/features/Hero/ui/HeroCampaignCta/HeroCampaignCta.jsx";
import QrCode from "@b2c/features/QrCode/QrCode.jsx";
import { buildViewPromotionAttr } from "@b2c/features/Hero/promotionTracking";
import { useHeaderHeightVar } from "@shared/hooks/useHeaderHeightVar";

const HeroV4 = ({
	title,
	subtitle,
	video,
	campaignCta,
	qr,
	simulator,
	className,
	tracking,
}: HeroV4Props) => {
	useHeaderHeightVar();

	const stickyCta = simulator?.cta;
	const stickyLabel =
		typeof stickyCta?.label === "string" ? stickyCta.label : "Je découvre mes conditions";
	const stickyHref = stickyCta?.href;
	const stickyTarget = stickyCta?.target;
	const stickyVariant = stickyCta?.variant;

	return (
		<div
			className={`${styles.heroWrapper} ${className ?? ""}`}
			data-tracking-view={buildViewPromotionAttr(tracking)}
		>
			<section className={styles.hero} data-hero-root="true">
				<HeroVideo
					srcDesktop={video.srcDesktop}
					srcMobile={video.srcMobile}
					poster={video.poster}
				/>
				<HeroOverlay />
				{qr && (
					<div className={styles.hero__qr}>
						<QrCode {...qr} />
					</div>
				)}
				{campaignCta && (
					<div className={styles["hero__campaign-cta"]}>
						<HeroCampaignCta {...campaignCta} />
					</div>
				)}
				<HeroContentMainVideo
					title={title}
					subtitle={subtitle}
					simulator={simulator}
					campaignCta={campaignCta}
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
		</div>
	);
};

export { HeroV4 };
export default HeroV4;
