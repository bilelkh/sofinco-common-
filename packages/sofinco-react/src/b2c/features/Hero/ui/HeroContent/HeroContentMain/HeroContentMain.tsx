import React from "react";
import type { HeroContentMainProps } from "@b2c/features/Hero/ui/HeroContent/HeroContentMain/HeroContentMain.type";
import HeroSimulator from "@b2c/features/Hero/ui/HeroSimulator/HeroSimulator";
import HeroArgs from "@b2c/features/Hero/ui/HeroArgs/HeroArgs";
import styles from "@b2c/features/Hero/ui/HeroContent/HeroContentMain/HeroContentMain.module.css";
import { FootnoteText } from "@shared/footnotes";

export const HeroContentMain = ({ title, subtitle, args, simulator }: HeroContentMainProps) => {
	return (
		<div className={styles.hero__content}>
			<div className={styles["hero__content-main"]}>
				{title && (
					<p className={styles.hero__title}>
						<FootnoteText>{title}</FootnoteText>
					</p>
				)}
				{args && <HeroArgs args={args} />}
				{subtitle && (
					<p className={styles.hero__subtitle}>
						<FootnoteText>{subtitle}</FootnoteText>
					</p>
				)}
			</div>

			{simulator && <HeroSimulator {...simulator} />}
		</div>
	);
};
