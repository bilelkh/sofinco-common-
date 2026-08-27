import Cta from "@shared/ui/Cta/Cta";
import HeroSimulator from "@b2c/features/Hero/ui/HeroSimulator/HeroSimulator";
import type { HeroContentMainBigRateProps } from "./HeroContentMainBigRate.type";
import styles from "./HeroContentMainBigRate.module.css";
import Badge from "@shared/ui/Badge/Badge";
import { FootnoteText } from "@shared/footnotes";
export default function HeroContentMainBigRate({
	subtitle,
	hookValue,
	hookDateLabel,
	cta,
	simulator,
	badgeLabel,
}: HeroContentMainBigRateProps) {
	return (
		<div className={styles.hero__content}>
			<div className={styles.hero__main}>
				{hookValue && (
					<p className={styles.hero__hook}>
						<FootnoteText>{hookValue}</FootnoteText>
					</p>
				)}
				{badgeLabel && <Badge label={badgeLabel} className={styles.hero__badge} />}
				{hookDateLabel && (
					<p className={styles.hero__date}>
						<FootnoteText>{hookDateLabel}</FootnoteText>
					</p>
				)}
				{subtitle && (
					<p className={styles.hero__subtitle}>
						<FootnoteText>{subtitle}</FootnoteText>
					</p>
				)}
				{cta && <Cta {...cta} className={styles.hero__cta} />}
			</div>
			{simulator && <HeroSimulator {...simulator} />}
		</div>
	);
}
