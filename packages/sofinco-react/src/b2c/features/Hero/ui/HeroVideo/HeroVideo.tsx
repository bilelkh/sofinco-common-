import { REDUCED_MOTION_QUERY, useMediaQuery } from "@shared/hooks/useMediaQuery";
import styles from "@b2c/features/Hero/ui/HeroVideo/HeroVideo.module.css";
import type { HeroVideoProps } from "@b2c/features/Hero/ui/HeroVideo/HeroVideo.type";

const HeroVideo = ({ srcDesktop, srcMobile, poster }: HeroVideoProps) => {
	const reduceMotion = useMediaQuery(REDUCED_MOTION_QUERY);

	return (
		<video
			className={styles.hero__bg}
			poster={poster}
			autoPlay={!reduceMotion}
			muted
			loop
			playsInline
			preload="auto"
			aria-hidden="true"
			tabIndex={-1}
		>
			{srcMobile && <source src={srcMobile} media="(max-width: 1023px)" />}
			<source src={srcDesktop} media="(min-width: 1024px)" />
		</video>
	);
};

export default HeroVideo;
