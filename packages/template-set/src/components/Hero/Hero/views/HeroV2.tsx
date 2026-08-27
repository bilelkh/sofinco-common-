import type { HeroV2Props } from "../hero.types";
import { HeroBg } from "./HeroBg";
import c from "./hero.module.css";
import { HeroOfferCard } from "sofinco-react";

export function HeroV2(p: HeroV2Props) {
	return (
		<div className={c.wrapper}>
			<div className={c.inner}>
				<HeroBg img={p.img} />
				<div className={c.overlay} aria-hidden="true" />

				<div className={c.v2Desk}>
					<div className={c.v2DeskTitle}>
						{p.title && <h1 className={c.title}>{p.title}</h1>}
						{p.subtitle && <p className={c.sub}>{p.subtitle}</p>}
					</div>
				</div>
			</div>

			<HeroOfferCard
				pinned
				titleBadge={p.offerTitleBadge}
				badge={p.offerBadge}
				rate={p.offerRate}
				rateLabel={p.offerRateLabel}
				rateLabelBis={p.offerRateLabelBis}
				amount={p.offerAmount}
				legalText={p.offerLegalText}
				cta={p.cta ?? undefined}
			/>
		</div>
	);
}
