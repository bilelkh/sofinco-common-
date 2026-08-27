import type { ReassurancePictoProps } from "./ReassurancePicto.type";
import styles from "./ReassurancePicto.module.css";
import Image from "@shared/ui/Image";
import { FootnoteText } from "@shared/footnotes";

/**
 * Rend UN picto de réassurance (icône décorative + libellé) dans un `<li>`.
 *
 * Le sous-composant possède **toute** sa structure DOM (wrapper `<li>` inclus)
 * pour une encapsulation propre — un dev qui utilise `<ReassurancePicto>` n'a
 * pas à connaître son container. Doit être utilisé dans un contexte `<ul>` /
 * `<ol>` parent pour rester HTML-valide.
 *
 * A11y : image décorative (`alt=""`) — le libellé porte tout le sens (WCAG 2.2 SC 1.1.1).
 */
export function ReassurancePicto({ src, label }: ReassurancePictoProps) {
	return (
		<li className={styles["reassurance-picto"]}>
			<Image
				src={src}
				decorative
				width={51}
				height={51}
				className={styles["reassurance-picto__image"]}
			/>
			<p className={styles["reassurance-picto__label"]}>
				<FootnoteText>{label}</FootnoteText>
			</p>
		</li>
	);
}

export default ReassurancePicto;
