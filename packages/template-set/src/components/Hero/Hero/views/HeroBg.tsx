import c from "./hero.module.css";

import type { HeroImgProps } from "sofinco-react";
import { clsx } from "clsx";

export function HeroBg({ img }: { img: HeroImgProps }) {
	const { lowSrc, desktopSrc, tabletSrc, mobileSrc } = img;
	const fallback = desktopSrc || tabletSrc || mobileSrc || lowSrc;

	return (
		<div className={c.bg} aria-hidden="true">
			{fallback && (
				<picture>
					{desktopSrc && <source media="(min-width: 1024px)" srcSet={desktopSrc} />}
					{tabletSrc && <source media="(min-width: 768px)" srcSet={tabletSrc} />}
					{mobileSrc && <source srcSet={mobileSrc} />}
					<img src={fallback} alt="" className={clsx(c.bgFinal, c.bgFinalIn)} />
				</picture>
			)}
		</div>
	);
}
