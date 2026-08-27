import { useId } from "react";
import clsx from "clsx";
import Link from "@shared/ui/Link/Link";
import SectionHeading from "@shared/ui/SectionHeading";
import Image from "@shared/ui/Image";
import type { ReassuranceProps } from "./Reassurance.type";
import styles from "./Reassurance.module.css";
import { FootnoteText } from "@shared/footnotes";

export const Reassurance = ({ title, subtitle, items, className }: ReassuranceProps) => {
	const headingId = useId();

	return (
		<section className={clsx(styles.reassurance, className)} aria-labelledby={headingId}>
			<SectionHeading
				id={headingId}
				title={title}
				subtitle={subtitle}
				align="center"
				visualStyle="none"
				className={styles.reassurance__header}
				titleClassName={styles.reassurance__title}
			/>

			<ul className={styles.reassurance__list}>
				{items.map((item) => (
					<li key={item.id} className={styles.reassurance__item}>
						{item.icon && (
							<Image
								src={item.icon}
								alt={item.iconAlt ?? ""}
								width={55}
								height={55}
								className={styles.reassurance__icon}
							/>
						)}
						<h3 className={styles["reassurance__item-title"]}>
							<FootnoteText>{item.title}</FootnoteText>
						</h3>
						{item.text && (
							<p className={styles["reassurance__item-text"]}>
								<FootnoteText>{item.text}</FootnoteText>
							</p>
						)}
						{item.link && <Link {...item.link} className={styles["sof-reassurance__item-link"]} />}
					</li>
				))}
			</ul>
		</section>
	);
};

export default Reassurance;
