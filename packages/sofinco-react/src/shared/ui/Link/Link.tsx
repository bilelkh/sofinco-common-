import type { LinkProps } from "./Link.type";
import { ICONS } from "@shared/ui/svg";
import { FootnoteText, footnoteDescribedBy } from "@shared/footnotes";

import styles from "./Link.module.css";

import clsx from "clsx";

const Link = ({
	id,
	href,
	isExternal,
	iconLeft,
	iconRight,
	theme = "light",
	label,
	iconVariant = "primary",
	className,
	tracking,
	onClick,
}: LinkProps) => {
	const mainClassName = clsx(
		styles.link,
		{
			[styles[`link--${iconVariant}`]]: iconVariant,
			[styles[`link--${theme}`]]: theme,
		},
		className,
	);
	const LeftIcon = iconLeft ? ICONS[iconLeft] : undefined;
	const RightIcon = iconRight ? ICONS[iconRight] : undefined;

	const trackingAttr = tracking?.event ? JSON.stringify(tracking) : undefined;

	return (
		<a
			id={id}
			href={href}
			target={isExternal ? "_blank" : "_self"}
			rel={isExternal ? "noopener noreferrer" : undefined}
			className={mainClassName}
			data-tracking={trackingAttr}
			onClick={onClick}
			/*
			 * Le renvoi du libellé est `aria-hidden` (il polluerait le nom accessible du
			 * lien) : la note est rattachée ici, en description. Rien si le libellé n'en
			 * porte aucun.
			 */
			aria-describedby={footnoteDescribedBy(label)}
		>
			{LeftIcon && (
				<span className={clsx(styles["link__icon"], styles["link__icon-left"])}>
					<LeftIcon />
				</span>
			)}
			{/* Déjà dans un <a> : renvoi rendu inerte, imbriquer des liens est invalide. */}
			<FootnoteText inert>{label}</FootnoteText>
			{RightIcon && (
				<span className={clsx(styles["link__icon"], styles["link__icon-right"])}>
					<RightIcon />
				</span>
			)}
		</a>
	);
};

export default Link;
