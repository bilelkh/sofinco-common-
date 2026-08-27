import type { SolutionCardProps } from "@b2c/features/SolutionSlider/SolutionSlider.type";
import Cta from "@shared/ui/Cta/Cta";
import styles from "@b2c/features/SolutionSlider/ui/SolutionCard/SolutionCard.module.css";
import Pill from "@shared/ui/Pill";
import Image from "@shared/ui/Image";
import { FootnoteText } from "@shared/footnotes";

export default function SolutionCard({
	image,
	imageMobile,
	title,
	description,
	features,
	cta,
	className,
}: SolutionCardProps) {
	return (
		<article className={`${styles["solution-card"]} ${className ?? ""}`}>
			<div className={styles["solution-card__image-container"]}>
				<Image
					src={image}
					width={350}
					height={200}
					sources={
						imageMobile
							? [{ media: "(max-width: 600px)", srcSet: imageMobile, width: 350, height: 200 }]
							: undefined
					}
					decorative
					className={styles["solution-card__image"]}
					pictureClassName={styles["solution-card__picture"]}
				/>
			</div>

			<div className={styles["solution-card__body"]}>
				<h3 className={styles["solution-card__title"]}>
					<FootnoteText>{title}</FootnoteText>
				</h3>
				<p className={styles["solution-card__description"]}>
					<FootnoteText>{description}</FootnoteText>
				</p>

				<ul className={styles["solution-card__feature-list"]}>
					{features.map((feature) => (
						<li key={feature}>
							<Pill label={feature} icon="check" />
						</li>
					))}
				</ul>

				<Cta
					type="button"
					variant={cta.variant ?? "primary"}
					size={cta.size ?? "medium"}
					label={cta.label}
					href={cta.href}
					className={styles["solution-card__cta-button"]}
					props={cta.target ? { target: cta.target } : undefined}
					ctaSection="solution-slider-card-cta"
				/>
			</div>
		</article>
	);
}
