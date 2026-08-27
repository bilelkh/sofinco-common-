import { sanitizeHtml } from "sofinco-react";
import type { FaqItemServer as FaqItemServerProps } from "../faqItem.types";
import classes from "./faqItem.module.css";

export function FaqItemServer({ question, answer }: FaqItemServerProps) {
	return (
		<div className={classes.faqItem}>
			<h4 className={classes.question}>{question}</h4>
			{answer && (
				<div
					className={classes.answer}
					// Rich-text HTML géré dans Jahia — injection volontaire, sanitisée
					// comme la vue live (Faq.tsx) pour rester cohérent.
					// eslint-disable-next-line @eslint-react/dom/no-dangerously-set-innerhtml
					dangerouslySetInnerHTML={{ __html: sanitizeHtml(answer) }}
				/>
			)}
		</div>
	);
}
