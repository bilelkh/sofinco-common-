import type { HeroProps } from "./hero.types";
import { HeroV1 } from "./HeroV1/HeroV1";
import { HeroV2 } from "./HeroV2/HeroV2";
import { HeroV3 } from "./HeroV3/HeroV3";
import { HeroV4 } from "./HeroV4/HeroV4";

export function Hero(props: HeroProps) {
	switch (props.variant) {
		case "v2":
			return <HeroV2 {...props} />;
		case "v3":
			return <HeroV3 {...props} />;
		case "v4":
			return <HeroV4 {...props} />;
		case "v1":
		default:
			return <HeroV1 {...props} />;
	}
}
