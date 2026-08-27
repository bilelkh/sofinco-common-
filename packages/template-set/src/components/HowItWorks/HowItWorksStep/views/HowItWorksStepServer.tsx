import { Image, type ScrollStepsItem } from "sofinco-react";
import classes from "./howItWorksStep.module.css";

/**
 * Carte d'édition d'une étape (mode auteur Jahia uniquement).
 * Volontairement minimaliste — l'image, le titre et la description suffisent
 * pour que l'auteur identifie chaque étape dans la pile. Le rendu final est
 * géré par le container React.
 *
 * La vignette est marquée `decorative` : c'est un repère visuel d'auteur dont
 * le sens est déjà porté par le titre d'étape juste à côté. On passe par le
 * flag du DS plutôt que par `alt=""` — l'union `ImageProps` est discriminée
 * sur `decorative` et c'est elle qui émet aussi `aria-hidden`. Le `imageAlt`
 * contribué reste porté par le rendu live (StepImageStack).
 */
export function HowItWorksStepServer({ title, description, imageUrl }: ScrollStepsItem) {
	return (
		<div className={classes.stepEdit}>
			{imageUrl && (
				<Image
					src={imageUrl}
					decorative
					width={56}
					height={56}
					className={classes.thumb}
					loading="lazy"
				/>
			)}
			<div className={classes.body}>
				<h4 className={classes.title}>{title}</h4>
				{description && <p className={classes.description}>{description}</p>}
			</div>
		</div>
	);
}
