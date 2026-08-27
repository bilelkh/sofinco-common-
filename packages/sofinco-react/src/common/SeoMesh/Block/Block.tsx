import clsx from "clsx";
import type { BlockProps } from "./Block.type";
import Cta from "@shared/ui/Cta/Cta";
import Link from "@shared/ui/Link";
import Title from "@/shared/ui/Title";

import styles from "./Block.module.css";
import { FootnoteText } from "@shared/footnotes";

const Block = ({ ctaProps, title, linkSectionLeft, linkSectionRight, className }: BlockProps) => {
	const mainClassName = clsx(styles["seomesh__block"], className);
	return (
		<section className={mainClassName}>
			<div className={styles["seomesh__block__header"]}>
				<Title className={styles["seomesh__block__title"]} as="h2">
					{title}
				</Title>
				<Cta {...ctaProps} className={styles["seomesh__block__cta"]} variant="primary" />
			</div>
			<nav className={styles["seomesh__block__content"]}>
				{linkSectionLeft && (
					<div className={styles["seomesh__block__linksection"]}>
						<h3 className={styles["seomesh__block__subtitle"]}>
							<FootnoteText>{linkSectionLeft.title}</FootnoteText>
						</h3>
						<ul className={styles["seomesh__block__linkwrapper"]}>
							{linkSectionLeft.links.map((link) => (
								<li key={link.id ?? link.href}>
									<Link className={styles["seomesh__block__link"]} {...link} />
								</li>
							))}
						</ul>
					</div>
				)}
				{linkSectionLeft && linkSectionRight && (
					<div className={styles["seomesh__block__divider"]} aria-hidden="true" />
				)}
				{linkSectionRight && (
					<div className={styles["seomesh__block__linksection"]}>
						<h3 className={styles["seomesh__block__subtitle"]}>
							<FootnoteText>{linkSectionRight.title}</FootnoteText>
						</h3>
						<ul className={styles["seomesh__block__linkwrapper"]}>
							{linkSectionRight.links.map((link) => (
								<li key={link.id ?? link.href}>
									<Link className={styles["seomesh__block__link"]} {...link} />
								</li>
							))}
						</ul>
					</div>
				)}
			</nav>
		</section>
	);
};

export default Block;
