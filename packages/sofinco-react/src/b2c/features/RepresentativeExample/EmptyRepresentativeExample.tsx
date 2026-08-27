import clsx from "clsx";
import classes from "./RepresentativeExample.module.css";
import Cta from "@shared/ui/Cta";
import type { EmptyRepresentativeExampleProps } from "./emptyRepresentativeExample.types";
import { sanitizeHtml } from "@utils/sanitizeHtml";
import { FootnoteText } from "@shared/footnotes";

export function EmptyRepresentativeExample(props: EmptyRepresentativeExampleProps) {
	const { title, subtitle, amountLabel, amount, cta } = props;

	return (
		<section className={classes["representative-example"]}>
			{title && (
				<h2 className={classes["representative-example__title"]}>
					<FootnoteText>{title}</FootnoteText>
				</h2>
			)}

			{subtitle && (
				<div
					className={classes["representative-example__subtitle"]}
					dangerouslySetInnerHTML={{ __html: sanitizeHtml(subtitle) }}
				/>
			)}

			{amount && (
				<div className={classes["representative-example__amount-card"]}>
					<span className={classes["representative-example__amount-label"]}>
						<FootnoteText>{amountLabel}</FootnoteText> :
					</span>
					<span className={classes["representative-example__amount-value"]}>{amount}</span>
				</div>
			)}

			{cta && (
				<Cta
					href={cta.href}
					target={cta.target ?? "_self"}
					className={clsx(
						classes["representative-example__cta"],
						classes["representative-example__cta-display"],
					)}
					variant="accent"
					label={cta.label}
					ctaSection={cta.ctaSection}
				/>
			)}
		</section>
	);
}
