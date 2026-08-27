import HeroSimulator from "@b2c/features/Hero/ui/HeroSimulator/HeroSimulator";
import HeroCampaignCta from "@b2c/features/Hero/ui/HeroCampaignCta/HeroCampaignCta";
import type { HeroContentMainVideoProps } from "@b2c/features/Hero/ui/HeroContent/HeroContentMainVideo/HeroContentMainVideo.type";
import styles from "@b2c/features/Hero/ui/HeroContent/HeroContentMainVideo/HeroContentMainVideo.module.css";
import { FootnoteText } from "@shared/footnotes";

export const HeroContentMainVideo = ({
	title,
	subtitle,
	simulator,
	campaignCta,
}: HeroContentMainVideoProps) => {
	return (
		<div className={styles.hero__content}>
			<div className={styles["hero__content-main"]}>
				{title && (
					<p className={styles.hero__title}>
						<FootnoteText>{title}</FootnoteText>
					</p>
				)}
				{subtitle && (
					<p className={styles.hero__subtitle}>
						<FootnoteText>{subtitle}</FootnoteText>
					</p>
				)}
				{campaignCta && (
					<div className={styles["hero__campaign-cta-mobile"]}>
						<HeroCampaignCta {...campaignCta} />
					</div>
				)}
			</div>

			{simulator && <HeroSimulator {...simulator} />}
		</div>
	);
};
