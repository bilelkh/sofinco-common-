import type { SectionProps } from "./section.types";
import classes from "./section.module.css";
import { Hero } from "../Hero";
import { QrSticker } from "../../QrCode/Hero/QrSticker";

export function SectionHero(props: SectionProps) {
	const heroProps = props.hero
		? {
				...props.hero,
				simulator: props.simulator || undefined,
			}
		: undefined;

	return (
		<div className={classes.heroSection}>
			{props.qrApp && <QrSticker {...props.qrApp} />}

			{heroProps && <Hero {...heroProps} />}
		</div>
	);
}
