import type { ReactNode } from "react";

import styles from "./WrapperLegacy.module.css";

interface WrapperLegacyProps {
	children: ReactNode;
}

export function WrapperLegacy({ children }: WrapperLegacyProps) {
	return (
		<div id="legacy__content__wrapper" className={styles.wrapperLegacy}>
			{children}
		</div>
	);
}
