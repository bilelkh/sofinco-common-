import clsx from "clsx";
import Cta from "@/shared/ui/Cta/Cta";
import Image from "@shared/ui/Image";
import type { CardProps } from "./Card.type";

import styles from "./Card.module.css";
import { FootnoteText } from "@shared/footnotes";

const Card = ({ img, title, description, ctaProps, className, date, dateIso, tag }: CardProps) => {
	return (
		<article className={clsx(styles["newsblock__card"], className)}>
			<div className={styles["newsblock__card__imageWrapper"]}>
				{/* `.newsblock__card__imageWrapper` is a full-width 240px-tall crop; editorial
				    visuals are cut 3/2, hence 360x240. */}
				<Image
					src={img.src}
					alt={img.alt ?? ""}
					width={360}
					height={240}
					className={styles["newsblock__card__image"]}
				/>
			</div>
			<div className={styles["newsblock__card__content"]}>
				<div className={styles["newsblock__card__meta"]}>
					<span className={styles["newsblock__card__tag"]}>{tag}</span>
					<time className={styles["newsblock__card__date"]} dateTime={dateIso}>
						{date}
					</time>
				</div>
				<h3 className={styles["newsblock__card__title"]}>
					<FootnoteText>{title}</FootnoteText>
				</h3>
				<p className={styles["newsblock__card__description"]}>
					<FootnoteText>{description}</FootnoteText>
				</p>
				<div className={styles["newsblock__card__ctaContainer"]}>
					<Cta
						size="medium"
						{...ctaProps}
						className={clsx(styles["newsblock__card__cta"], ctaProps.className)}
					/>
				</div>
			</div>
		</article>
	);
};

export default Card;
