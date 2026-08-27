export type HeroImgProps = {
	/** LQIP blur placeholder, painted as the `<picture>` background while the image decodes. */
	lowSrc: string;
	/** Fallback `<img>` src, and the desktop `<source>` (≥1024px). */
	desktopSrc: string;
	/** Art-directed tablet source (768–1023px). */
	tabletSrc: string;
	/** Art-directed mobile source (≤767px). */
	mobileSrc: string;
};
