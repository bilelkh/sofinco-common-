import clsx from "clsx";

import { type AlertBandProps } from "./AlertBand.type";
import styles from "./AlertBand.module.css";
import { FootnoteText } from "@shared/footnotes";

const AlertBand = ({
	message,
	variant = "sanitary",
	className,
	iconLeft,
	iconRight,
	style,
}: AlertBandProps) => {
	const mainClassName = clsx(styles["alert-band"], styles[`alert-band--${variant}`], className);

	return (
		<span className={mainClassName} style={style}>
			{iconLeft}
			<FootnoteText>{message}</FootnoteText>
			{iconRight}
		</span>
	);
};

export default AlertBand;
