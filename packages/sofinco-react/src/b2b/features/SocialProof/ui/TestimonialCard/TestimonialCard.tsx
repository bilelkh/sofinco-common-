import clsx from "clsx";

import Image from "@shared/ui/Image";
import Link from "@shared/ui/Link/Link";
import { FootnoteText } from "@shared/footnotes";
import type { TestimonialCardProps } from "@b2b/features/SocialProof/SocialProof.type";
import styles from "@b2b/features/SocialProof/ui/TestimonialCard/TestimonialCard.module.css";

/**
 * Carte témoignage du bloc « Ils nous font confiance ».
 *
 * Rendue en `<figure>` / `<blockquote>` / `<figcaption>` : c'est le balisage que les
 * lecteurs d'écran annoncent comme une citation attribuée, là où une suite de `<p>`
 * perdrait le lien entre le propos et son auteur.
 *
 * La teinte est portée par deux variables locales (`--testimonial-card-bg`, `-fg`)
 * redéfinies par le modificateur, sur le modèle de `Badge`.
 */
export default function TestimonialCard({
	quote,
	authorName,
	authorRole,
	avatarSrc,
	avatarAlt,
	link,
	tone = "light",
	className,
}: TestimonialCardProps) {
	return (
		<figure className={clsx(styles["testimonial-card"], styles[`testimonial-card--${tone}`], className)}>
			{avatarSrc &&
				(avatarAlt ? (
					<Image
						src={avatarSrc}
						alt={avatarAlt}
						width={72}
						height={72}
						className={styles["testimonial-card__avatar"]}
					/>
				) : (
					<Image
						src={avatarSrc}
						decorative
						width={72}
						height={72}
						className={styles["testimonial-card__avatar"]}
					/>
				))}

			<blockquote className={styles["testimonial-card__quote"]}>
				<FootnoteText>{quote}</FootnoteText>
			</blockquote>

			<figcaption className={styles["testimonial-card__signature"]}>
				<span className={styles["testimonial-card__author"]}>
					<FootnoteText>{authorName}</FootnoteText>
				</span>
				{authorRole && (
					<span className={styles["testimonial-card__role"]}>
						<FootnoteText>{authorRole}</FootnoteText>
					</span>
				)}
			</figcaption>

			{link && (
				<div className={styles["testimonial-card__link-wrapper"]}>
					<Link
						href={link.href}
						label={link.label}
						isExternal={link.isExternal}
						iconRight="chevron-right"
						tracking={link.tracking}
						className={styles["testimonial-card__link"]}
					/>
				</div>
			)}
		</figure>
	);
}
