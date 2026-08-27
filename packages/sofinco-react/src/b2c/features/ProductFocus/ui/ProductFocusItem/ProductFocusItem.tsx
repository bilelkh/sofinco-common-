import type { ProductFocusItemProps } from "./ProductFocusItem.type";
import styles from "./ProductFocusItem.module.css";
import { FootnoteText } from "@shared/footnotes";

/**
 * Sub-component of the `<ProductFocus>` design-system block — renders ONE
 * item of the grid as a `<li>` (label pill + description).
 */
export function ProductFocusItem({ label, description }: ProductFocusItemProps) {
	return (
		<li className={styles["product-focus-item"]}>
			<span className={styles["product-focus-item__label"]}>
				<FootnoteText>{label}</FootnoteText>
			</span>
			<p className={styles["product-focus-item__description"]}>
				<FootnoteText>{description}</FootnoteText>
			</p>
		</li>
	);
}
