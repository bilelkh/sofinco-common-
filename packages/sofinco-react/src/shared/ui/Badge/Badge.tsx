import clsx from "clsx";

import type { BadgeProps } from "./Badge.type";
import styles from "./Badge.module.css";
import { FootnoteText } from "@shared/footnotes";

const Badge = ({ label, variant = "primary", className }: BadgeProps) => {
	const mainClassName = clsx(styles.badge, styles[`badge--${variant}`], className);

	return (
		<span className={mainClassName}>
			<FootnoteText>{label}</FootnoteText>
		</span>
	);
};

export default Badge;
