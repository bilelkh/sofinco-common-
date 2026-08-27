import clsx from "clsx";

import Title from "../Title";
import Subtitle from "../Subtitle";
import { FootnoteText } from "@shared/footnotes";
import type { SectionHeadingProps } from "./SectionHeading.type";
import styles from "./SectionHeading.module.css";

const SectionHeading = ({
	title,
	subtitle,
	eyebrow,
	titleAs = "h2",
	visualStyle,
	variant = "dark",
	align = "start",
	id,
	className,
	titleClassName,
	children,
	ref,
}: SectionHeadingProps) => {
	return (
		<header ref={ref} className={clsx(styles.heading, styles[`heading--${align}`], className)}>
			{eyebrow && (
				<span className={styles.heading__eyebrow}>
					<FootnoteText>{eyebrow}</FootnoteText>
				</span>
			)}

			{title && (
				<Title
					as={titleAs}
					visualStyle={visualStyle}
					variant={variant}
					id={id}
					className={titleClassName}
				>
					{title}
				</Title>
			)}

			{subtitle && <Subtitle variant={variant}>{subtitle}</Subtitle>}
			{children}
		</header>
	);
};

export default SectionHeading;
