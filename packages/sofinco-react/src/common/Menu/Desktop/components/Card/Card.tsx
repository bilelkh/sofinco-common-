import clsx from "clsx";
import { type CardProps } from "./Card.type";
import Cta from "@shared/ui/Cta/Cta";
import Image from "@shared/ui/Image";

import styles from "./Card.module.css";
import { FootnoteText } from "@shared/footnotes";

const Card = ({ image, variant = "default", title, cta, className }: CardProps) => {
	const mainClassName = clsx(styles.menu__card, styles[`menu__card--${variant}`], className);

	if (variant === "fullbg") {
		return (
			<div className={mainClassName}>
				{/* Menu visuals are cut 319px wide. `fullbg` stacks it in a grid cell, so CSS
				    fixes the box; the height below is the reference crop for that layout. */}
				<Image
					src={image}
					alt={title ?? ""}
					width={319}
					height={185}
					className={styles.menu__card__image}
				/>
				<div className={styles.menu__card__content}>
					<h3 className={styles.menu__card__title}>
						<FootnoteText>{title}</FootnoteText>
					</h3>
					{cta && <Cta {...cta} />}
				</div>
			</div>
		);
	}

	return (
		<div className={mainClassName}>
			{/* `default` lets the card height follow the visual — this is the taller crop the
			    variant is designed around. */}
			<Image
				src={image}
				alt={title ?? ""}
				width={319}
				height={286}
				className={styles.menu__card__image}
			/>
			<div className={styles.menu__card__content}>
				<h3 className={styles.menu__card__title}>
					<FootnoteText>{title}</FootnoteText>
				</h3>
				{cta && <Cta {...cta} />}
			</div>
		</div>
	);
};

export default Card;
