import clsx from "clsx";

import Cta from "@shared/ui/Cta/Cta";
import Pill from "@shared/ui/Pill";
import Badge from "@shared/ui/Badge/Badge";
import type { ComparatorCardProps } from "@b2c/features/CardComparatorTable/CardComparatorTable.type";
import Image from "@shared/ui/Image";
import styles from "./ComparatorCard.module.css";
import { FootnoteText } from "@shared/footnotes";

export default function ComparatorCard({
	image,
	title,
	description,
	features,
	cta,
	badgeLabel,
	className,
}: ComparatorCardProps) {
	return (
		<article className={clsx(styles["comparator-card"], className)}>
			{badgeLabel && (
				<Badge variant="accent" label={badgeLabel} className={styles["comparator-card__badge"]} />
			)}

			<div className={styles["comparator-card__image-container"]}>
				{/* `.comparator-card__image-container` box: `aspect-ratio: 4 / 3` at its
				    `max-width: 580px`. */}
				<Image
					src={image}
					decorative
					width={580}
					height={435}
					className={styles["comparator-card__image"]}
				/>
			</div>

			<div className={styles["comparator-card__body"]}>
				<h3 className={styles["comparator-card__title"]}>
					<FootnoteText>{title}</FootnoteText>
				</h3>
				<p className={styles["comparator-card__description"]}>
					<FootnoteText>{description}</FootnoteText>
				</p>

				<div className={styles["comparator-card__feature-list"]}>
					{features.map((feature) => (
						<span key={feature.id}>
							<Pill label={feature.label} icon={feature.included === false ? "x-round" : "check"} />
						</span>
					))}
				</div>

				<Cta
					type="button"
					variant={cta.variant ?? "primary"}
					size={cta.size ?? "medium"}
					label={cta.label}
					href={cta.href}
					className={styles["comparator-card__cta-button"]}
					target={cta?.target}
					ctaSection={cta.ctaSection ?? "card-comparator-table-cta"}
				/>
			</div>
		</article>
	);
}
