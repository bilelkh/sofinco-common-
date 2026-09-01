import clsx from "clsx";
import type { BlockProps } from "./Block.type";
import Cta from "@shared/ui/Cta/Cta";
import Link from "@shared/ui/Link";
import Title from "@/shared/ui/Title";

import styles from "./Block.module.css";

const Block = ({
	ctaProps,
	title,
	titleAs,
	titleStyle,
	linkSectionLeft,
	linkSectionRight,
	className,
}: BlockProps) => {
	const mainClassName = clsx(styles["seomesh__block"], className);
	return (
		<section className={mainClassName}>
			<div className={styles["seomesh__block__header"]}>
				{/* Niveau CONTRIBUÉ, avec repli h2 : `as="h2"` en dur ignorait le choix de l'auteur,
				    que l'aperçu d'édition appliquait pourtant déjà. `titleStyle` garde l'apparence
				    constante quand le niveau change — c'est tout l'intérêt du découplage. */}
				<Title
					className={styles["seomesh__block__title"]}
					as={titleAs ?? "h2"}
					visualStyle={titleStyle ?? "h2"}
				>
					{title}
				</Title>
				<Cta {...ctaProps} className={styles["seomesh__block__cta"]} variant="primary" />
			</div>
			<nav className={styles["seomesh__block__content"]}>
				{linkSectionLeft && (
					<div className={styles["seomesh__block__linksection"]}>
						<Title
							as={linkSectionLeft.titleAs ?? "h3"}
							visualStyle="h3"
							className={styles["seomesh__block__subtitle"]}
						>
							{linkSectionLeft.title}
						</Title>
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
						<Title
							as={linkSectionRight.titleAs ?? "h3"}
							visualStyle="h3"
							className={styles["seomesh__block__subtitle"]}
						>
							{linkSectionRight.title}
						</Title>
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
