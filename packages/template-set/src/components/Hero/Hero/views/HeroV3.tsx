import type { HeroV3Props } from "../hero.types";
import { HeroBg } from "./HeroBg";
import { Cta } from "sofinco-react";
import c from "./hero.module.css";
import { Badge } from "sofinco-react";

export function HeroV3(p: HeroV3Props) {
	return (
		<div className={c.wrapper}>
			<div className={c.inner}>
				<HeroBg img={p.img} />
				<div className={c.overlayV3} aria-hidden="true" />

				<div className={c.v3Content}>
					{p.hookValue && <span className={c.v3Rate}>{p.hookValue}</span>}
					{p.badgeLabel && <Badge label={p.badgeLabel} className={c.hero__badge} />}
					{p.hookDateLabel && <span className={c.v3Date}>{p.hookDateLabel}</span>}
					{p.subtitle && <p className={c.v3Sub}>{p.subtitle}</p>}

					{p.cta && <Cta {...p.cta} className={c.v3Cta} />}
				</div>
			</div>
		</div>
	);
}
