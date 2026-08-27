import clsx from "clsx";
import type { NewsBlockProps } from "./NewsBlock.type";
import SectionHeading from "@shared/ui/SectionHeading";
import Card from "./Card/Card";

import styles from "./NewsBlock.module.css";

const NewsBlock = ({ header, title, cards, subtitle, className }: NewsBlockProps) => {
	return (
		<section className={clsx(styles["newsblock"], className)}>
			<div className={styles["newsblock__container"]}>
				<SectionHeading
					eyebrow={header}
					title={title}
					subtitle={subtitle}
					align="center"
					className={styles["newsblock__header"]}
				/>
				<div className={styles["newsblock__cardlist"]}>
					{cards.map((card) => (
						<Card key={card.title} {...card} />
					))}
				</div>
			</div>
		</section>
	);
};

export default NewsBlock;
