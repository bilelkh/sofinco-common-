import { useId } from "react";
import clsx from "clsx";
import type { ProFinancingCtaProps } from "@b2b/features/ProFinancingCta/proFinancingCta.types";
import styles from "@b2b/features/ProFinancingCta/proFinancingCta.module.css";
import Cta from "@shared/ui/Cta/Cta";
import { FootnoteText } from "@shared/footnotes";

export const ProFinancingCta = ({
	eyebrow,
	title,
	subtitle,
	cta,
	className,
}: ProFinancingCtaProps) => {
	const headingId = useId();

	return (
		<section
			className={clsx(styles["pro-financing-cta"], className)}
			aria-labelledby={headingId}
		>
			{eyebrow && (
				<p className={styles["pro-financing-cta__eyebrow"]}>
					<FootnoteText>{eyebrow}</FootnoteText>
				</p>
			)}
			<h2 id={headingId} className={styles["pro-financing-cta__title"]}>
				<FootnoteText>{title}</FootnoteText>
			</h2>
			{subtitle && (
				<p className={styles["pro-financing-cta__subtitle"]}>
					<FootnoteText>{subtitle}</FootnoteText>
				</p>
			)}
			<div className={styles["pro-financing-cta__action"]}>
				<Cta
					variant="accent"
					size="large"
					label={cta.label}
					href={cta.href}
					onClick={cta.onClick}
					tracking={cta.tracking}
				/>
			</div>
		</section>
	);
};

export default ProFinancingCta;
