import { useId } from "react";
import clsx from "clsx";
import Link from "@shared/ui/Link/Link";
import SectionHeading from "@shared/ui/SectionHeading";
import Title from "@shared/ui/Title";
import Image from "@shared/ui/Image";
import type { ReassuranceProps } from "./Reassurance.type";
import styles from "./Reassurance.module.css";
import { FootnoteText } from "@shared/footnotes";

export const Reassurance = ({ sectionHeadingProps, items, className }: ReassuranceProps) => {
	const headingId = useId();

	// `aria-labelledby` CONDITIONNEL : sans en-tête il n'y a aucun titre à référencer,
	// donc aucun `id` émis. Le pointer quand même laisse un attribut orphelin, que les
	// lecteurs d'écran traitent comme une section sans nom — pire que pas d'attribut.
	return (
		<section
			className={clsx(styles.reassurance, className)}
			aria-labelledby={sectionHeadingProps ? headingId : undefined}
		>
			{/* Le mapper renvoie `undefined` quand le titre est vide, et le contrat annoncé
			    est « le DS omet alors l'en-tête entier ». Sans ce garde, <SectionHeading>
			    rendait un <header> vide mais stylé — une bande d'espacement fantôme.

			    CONVENTION D'ORDRE — les props contribuées d'abord, celles que la SECTION
			    possède ensuite. `id` alimente l'`aria-labelledby` ci-dessus, `align` et
			    `visualStyle` sont des décisions de maquette : aucune ne doit pouvoir être
			    écrasée par un mapper. `visualStyle="none"` en particulier, sinon la typo
			    vient de `.title--h2` (--text-5xl ≥1024px) au lieu de `.reassurance__title`. */}
			{sectionHeadingProps && (
				<SectionHeading
					{...sectionHeadingProps}
					id={headingId}
					align="center"
					visualStyle="none"
					className={styles.reassurance__header}
					titleClassName={styles.reassurance__title}
				/>
			)}

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
						<Title
							as={item.titleAs ?? "h3"}
							visualStyle="none"
							className={styles["reassurance__item-title"]}
						>
							{item.title}
						</Title>
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
