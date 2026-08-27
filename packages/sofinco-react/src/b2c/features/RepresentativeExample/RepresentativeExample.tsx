import clsx from "clsx";
import classes from "./RepresentativeExample.module.css";
import Cta from "@shared/ui/Cta/index.js";
import type { RepresentativeExampleProps } from "./representativeExample.types.js";
import { sanitizeHtml } from "@utils/sanitizeHtml";
import { FootnoteText } from "@shared/footnotes";

/**
 * Exemple représentatif d'un financement.
 *
 * Ce composant ne produit AUCUN balisage SEO. Le JSON-LD `LoanOrCredit` est émis
 * une seule fois par page, dans le `@graph` du `<head>`, depuis le mixin
 * `sofmix:loanProductSchema` : il y décrit les PLAGES de l'offre (montant, durée,
 * TAEG) en valeurs numériques, là où ce bloc n'affiche qu'un point de la grille sous
 * forme de chaînes formatées (« 3 000 € », « 4,6 ») que schema.org n'interprète pas.
 */
export function RepresentativeExample(props: RepresentativeExampleProps) {
	const { title, subtitle, amountLabel, exampleAmount, rows, insuranceLegalText, cta } = props;

	return (
		<section className={classes["representative-example"]}>
			<h2 className={classes["representative-example__title"]}>
				<FootnoteText>{title}</FootnoteText>
			</h2>

			<div
				className={classes["representative-example__subtitle"]}
				dangerouslySetInnerHTML={{ __html: sanitizeHtml(subtitle) }}
			/>

			<div className={classes["representative-example__amount-card"]}>
				<span className={classes["representative-example__amount-label"]}>
					<FootnoteText>{amountLabel}</FootnoteText> :
				</span>
				<span className={classes["representative-example__amount-value"]}>{exampleAmount}</span>
			</div>

			<table className={classes["representative-example__table"]}>
				<caption className={classes["representative-example__sr-only"]}>
					<FootnoteText>{amountLabel}</FootnoteText> {exampleAmount}
				</caption>
				<thead>
					<tr>
						{rows.map((row) => (
							<th
								key={row.label}
								scope="col"
								className={clsx(
									classes["representative-example__th"],
									row.highlighted && classes["representative-example__th--highlighted"],
								)}
							>
								<FootnoteText>{row.label}</FootnoteText>
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					<tr>
						{rows.map((row) => (
							<td
								key={row.label}
								data-label={row.label}
								className={clsx(
									classes["representative-example__td"],
									row.highlighted && classes["representative-example__td--highlighted"],
								)}
							>
								{row.value}
							</td>
						))}
					</tr>
				</tbody>
			</table>

			<div
				className={classes["representative-example__insurance-legal"]}
				dangerouslySetInnerHTML={{ __html: sanitizeHtml(insuranceLegalText) }}
			/>

			{cta && (
				<Cta
					href={cta.href}
					target={cta.target ?? "_self"}
					className={classes["representative-example__cta"]}
					variant="accent"
					label={cta.label}
				/>
			)}
		</section>
	);
}
