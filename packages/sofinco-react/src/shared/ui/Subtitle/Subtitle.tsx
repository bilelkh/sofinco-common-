import type { SubtitleProps } from "./Subtitle.type";
import clsx from "clsx";
import { FootnoteText } from "@shared/footnotes";

import styles from "./Subtitle.module.css";

const Subtitle = ({
	children,
	as: Component = "p",
	variant = "dark",
	className,
	id,
}: SubtitleProps) => {
	const mainClassName = clsx(styles.subtitle, styles[`subtitle--${variant}`], className);

	return (
		<Component className={mainClassName} id={id}>
			<FootnoteText>{children}</FootnoteText>
		</Component>
	);
};

export default Subtitle;
