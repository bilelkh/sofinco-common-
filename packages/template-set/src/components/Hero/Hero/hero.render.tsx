import { HeroV2 } from "./views/HeroV2";
import { HeroV3 } from "./views/HeroV3";
import { HeroV4 } from "./views/HeroV4";
import { HeroV1 } from "./views/HeroV1";
import type { HeroProps } from "./hero.types";

import type { HeroProps as HeroClientProps } from "sofinco-react";
import { Hero } from "sofinco-react";

export function renderHeroViewClient(props: HeroClientProps) {
	return <Hero {...props} />;
}

export function renderHeroViewServer(props: HeroProps) {
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
