import clsx from "clsx";
import type { ReassurancePictosProps } from "./ReassurancePictos.type";
import { ReassurancePicto } from "./ui/ReassurancePicto/ReassurancePicto";
import styles from "./ReassurancePictos.module.css";

export function ReassurancePictos({ items, ariaLabel, className }: ReassurancePictosProps) {
	return (
		<section
			aria-label={ariaLabel || undefined}
			className={clsx(styles["pictos-block"], className)}
		>
			<ul className={styles["pictos-block__list"]}>
				{items.map((item) => (
					<ReassurancePicto key={item.id} src={item.src} label={item.label} />
				))}
			</ul>
		</section>
	);
}

export default ReassurancePictos;
