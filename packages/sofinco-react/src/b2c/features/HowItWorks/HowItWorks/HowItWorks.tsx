import { useId } from "react";
import type { HowItWorksProps } from "./howItWorks.types";
import classes from "./howItWorks.module.css";
import { ScrollSteps } from "@common/ScrollSteps";
import VideoBlock from "../../VideoBlock/VideoBlock";
import Title from "@shared/ui/Title/Title";
import Cta from "@shared/ui/Cta/Cta";
import { FootnoteText } from "@shared/footnotes";

/**
 * "Comment ça marche" — bloc d'assemblage.
 *
 * Agence, de haut en bas :
 *   1. un en-tête (titre H2 + sous-titre) contribuable Jahia (R.G. 1 & 2) ;
 *   2. le parcours d'étapes <ScrollSteps>, qui gère seul l'animation
 *      hover (desktop) / scroll "roulette" (mobile) (R.G. 3) ;
 *   3. un CTA optionnel ;
 *   4. un <VideoBlock> optionnel portant son propre titre (R.G. 4).
 *
 * Toute la logique d'étapes vit dans <ScrollSteps> : ce composant ne fait
 * qu'assembler des briques autonomes du DS.
 */
export function HowItWorks({ title, subtitle, steps, cta, video, imagePosition }: HowItWorksProps) {
	const titleId = useId();

	return (
		<section className={classes.howItWorks} aria-labelledby={titleId}>
			<div className={classes.header}>
				{title && (
					<Title
						as={title.as ?? "h2"}
						visualStyle={title.visualStyle ?? "h2"}
						id={titleId}
						className={classes.title}
					>
						{title.children}
					</Title>
				)}
				{subtitle && (
					<p className={classes.subtitle}>
						<FootnoteText>{subtitle}</FootnoteText>
					</p>
				)}
			</div>

			<ScrollSteps items={steps} imagePosition={imagePosition} />

			{cta && (
				<div className={classes.ctaWrapper}>
					<Cta {...cta} />
				</div>
			)}

			{video && <VideoBlock {...video} />}
		</section>
	);
}
