import clsx from "clsx";

import { ICONS } from "@shared/ui/svg";
import type { PillProps } from "./Pill.type";
import styles from "./Pill.module.css";
import { FootnoteText } from "@shared/footnotes";

const Pill = ({ label, icon, className }: PillProps) => {
	const mainClassName = clsx(styles.pill, className);
	const Icon = icon ? ICONS[icon] : null;

	return (
		<span className={mainClassName}>
			{Icon && (
				<span className={styles.pill__icon} aria-hidden="true">
					<Icon />
				</span>
			)}
			<span className={styles.pill__label}>
				<FootnoteText>{label}</FootnoteText>
			</span>
		</span>
	);
};

export default Pill;
