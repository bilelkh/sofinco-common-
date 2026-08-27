import clsx from "clsx";

import type { CtaProps } from "./Cta.type";
import styles from "./Cta.module.css";
import Loader from "../svg/loader";
import { ICONS } from "@shared/ui/svg";
import { FootnoteText, footnoteDescribedBy } from "@shared/footnotes";

const Cta = ({
	label,
	className,
	isLoading,
	isDisabled,
	iconLeft,
	iconRight,
	iconOnly,
	type = "button",
	href,
	variant = "primary",
	size = "medium",
	onClick = () => {},
	tracking,
	ctaSection,
	target,
	props,
}: CtaProps) => {
	const mainClassName = clsx(
		styles.cta,
		{ [styles[`cta--iconOnly`]]: iconOnly },
		styles[`cta--${variant}`],
		isLoading && styles["cta--loading"],
		isDisabled && styles["cta--disabled"],
		styles[`cta--${size}`],
		className,
	);

	const IconLeftComponent = iconLeft ? ICONS[iconLeft] : null;
	const IconRightComponent = iconRight ? ICONS[iconRight] : null;

	/*
	 * Le renvoi porté par le libellé est rendu INERTE et `aria-hidden` — un `<a>` ne peut
	 * pas vivre dans un `<a>` ni dans un `<button>`, et laissé visible il rejoindrait le
	 * nom accessible (« Je profite de l'offre 2 »). La note est donc rattachée en
	 * DESCRIPTION de l'élément interactif, canal prévu pour ça. `undefined` quand le
	 * libellé ne porte aucun renvoi, pour ne pas émettre un attribut vide.
	 *
	 * Posé avant `{...props}` : un `aria-describedby` fourni par l'appelant reste maître.
	 */
	const footnoteDescription = footnoteDescribedBy(label);

	const clickCtaEvent = {
		event: "click_cta",
		cta_label: label ?? "",
		cta_section: ctaSection ?? "",
		cta_url: href ?? "",
	};
	const events: Array<Record<string, unknown>> = tracking?.event
		? [tracking as Record<string, unknown>, clickCtaEvent]
		: [clickCtaEvent];
	const trackingAttr = isDisabled
		? undefined
		: JSON.stringify(events.length === 1 ? events[0] : events);

	if (isLoading) {
		return (
			<button type={type} className={mainClassName} disabled>
				<Loader />
				<span className={styles["sr-only"]}>Chargement</span>
			</button>
		);
	}

	if (href) {
		return (
			<a
				href={href}
				className={mainClassName}
				aria-disabled={isDisabled}
				data-tracking={trackingAttr}
				target={target}
				rel={target === "_blank" ? "noopener noreferrer" : undefined}
				aria-describedby={footnoteDescription}
				{...props}
			>
				{IconLeftComponent && (
					<span className={styles["cta__icon-left"]}>
						<IconLeftComponent />
					</span>
				)}
				<span className={clsx({ [styles["sr-only"]]: iconOnly })}>
					{/* Élément interactif (<a> ou <button>) : renvoi rendu inerte. */}
					<FootnoteText inert>{label}</FootnoteText>
				</span>
				{IconRightComponent && (
					<span className={styles["cta__icon-right"]}>
						<IconRightComponent />
					</span>
				)}
			</a>
		);
	}

	return (
		<button
			type={type}
			onClick={onClick}
			className={mainClassName}
			disabled={isDisabled}
			data-tracking={trackingAttr}
			aria-describedby={footnoteDescription}
			{...props}
		>
			{IconLeftComponent && (
				<span className={styles["cta__icon-left"]}>
					<IconLeftComponent />
				</span>
			)}
			<span className={clsx({ [styles["sr-only"]]: iconOnly })}>
				{/* `inert` OBLIGATOIRE ici aussi : un <a> dans un <button> est invalide, et les
				    navigateurs le désimbriquent de façon imprévisible. */}
				<FootnoteText inert>{label}</FootnoteText>
			</span>
			{IconRightComponent && (
				<span className={styles["cta__icon-right"]}>
					<IconRightComponent />
				</span>
			)}
		</button>
	);
};

export default Cta;
