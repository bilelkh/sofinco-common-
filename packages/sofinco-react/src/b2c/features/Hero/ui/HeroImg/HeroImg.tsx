import styles from "@b2c/features/Hero/ui/HeroImg/HeroImg.module.css";
import type { HeroImgProps } from "@b2c/features/Hero/ui/HeroImg/HeroImg.type";

/**
 * Deliberately NOT migrated to the shared `Image` primitive: this is a full-bleed
 * hero background with an LQIP blur (inline `backgroundImage` on the `<picture>`) and
 * art-directed sources — visual concerns the generic `Image` primitive intentionally
 * does not carry. It stays hand-rolled as the specialized hero case.
 *
 * As the LCP element it keeps `loading="eager"` + `fetchPriority="high"`.
 */
const HeroImg = ({ lowSrc, desktopSrc, tabletSrc, mobileSrc }: HeroImgProps) => {
	return (
		<picture
			className={styles.hero__bg}
			style={lowSrc ? { backgroundImage: `url(${lowSrc})` } : undefined}
		>
			<source media="(min-width: 1024px)" srcSet={desktopSrc} width={1440} height={722} />
			<source media="(min-width: 768px)" srcSet={tabletSrc} width={1024} height={1366} />
			<source media="(max-width: 767px)" srcSet={mobileSrc} width={420} height={842} />
			<img
				src={desktopSrc}
				alt=""
				width={1440}
				height={722}
				className={styles["hero__bg-img"]}
				draggable={false}
				loading="eager"
				fetchPriority="high"
				decoding="async"
			/>
		</picture>
	);
};

export default HeroImg;
