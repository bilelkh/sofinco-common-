import { RenderChildren } from "@jahia/javascript-modules-library";
import type { HeroV1Props } from "../hero.types";
import { HeroBg } from "./HeroBg";
import c from "./hero.module.css";

export function HeroV1(p: HeroV1Props) {
	return (
		<div className={c.wrapper}>
			<div className={c.inner}>
				<HeroBg img={p.img} />
				<div className={c.overlay} aria-hidden="true" />

				<div className={c.v1DeskCenter}>
					{p.title && <h1 className={c.title}>{p.title}</h1>}
					{p.subtitle && <p className={c.sub}>{p.subtitle}</p>}
				</div>

				<div className={c.v1PillsEdit}>
					<RenderChildren nodeTypes={["sofnt:heroArgument"]} filter="sofnt:heroArgument" />
				</div>
			</div>
		</div>
	);
}
