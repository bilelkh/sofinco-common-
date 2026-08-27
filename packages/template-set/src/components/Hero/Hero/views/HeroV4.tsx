import type { HeroV4Props } from "../hero.types";
import { Cta } from "sofinco-react";
import c from "./hero.module.css";

export function HeroV4(p: HeroV4Props) {
	const ctaElement = p.cta && <Cta {...p.cta} className={c.v4Cta} iconLeft="arrow-right" />;

	// Desktop source defaults to the mobile clip (and vice-versa) when only one is provided.
	const desktopVideo = p.videoUrl || p.videoMobileUrl;
	const mobileVideo = p.videoMobileUrl || p.videoUrl;

	return (
		<div className={c.wrapper}>
			<div className={c.inner}>
				{p.videoPosterUrl && (
					<img src={p.videoPosterUrl} alt="" className={c.vPoster} aria-hidden="true" />
				)}
				{desktopVideo && (
					<video
						poster={p.videoPosterUrl || undefined}
						className={[c.vBg, c.vBgOn].join(" ")}
						autoPlay
						loop
						muted
						playsInline
						aria-hidden="true"
					>
						{mobileVideo && <source media="(max-width: 767px)" src={mobileVideo} />}
						<source src={desktopVideo} />
					</video>
				)}
				<div className={c.overlay} role="presentation" aria-hidden="true" />

				<div className={c.v4Desk}>
					{ctaElement}
					<div className={c.v4DeskCenter}>
						{p.title && <h1 className={c.title}>{p.title}</h1>}
						{p.subtitle && <p className={c.sub}>{p.subtitle}</p>}
					</div>
				</div>
			</div>
		</div>
	);
}
