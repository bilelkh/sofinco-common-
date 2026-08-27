import styles from "./ComparativeTable.module.css";
import type { ComparativeTableProps } from "./comparativeTable.type";
import Cta from "@shared/ui/Cta/Cta";
import SectionHeading from "@shared/ui/SectionHeading";
import React, { useId } from "react";
import { ICONS } from "@shared/ui/svg";
import { FootnoteText } from "@shared/footnotes";
export function ComparativeTable({
	title,
	subtitle,
	rowHeaderLabel,
	leftColumnLabel,
	rightColumnLabel,
	leftColumnButton,
	rightColumnButton,
	rows,
}: ComparativeTableProps) {
	const titleId = useId();
	return (
		<section className={styles.comparativeTable} aria-labelledby={titleId}>
			<SectionHeading titleAs="h2" id={titleId} title={title} subtitle={subtitle} align="center" />

			{/* MOBILE */}

			<table className={styles.comparativeTable__mobileTable}>
				<caption className={styles.comparativeTable__srOnly}>
					<FootnoteText>{title}</FootnoteText>
				</caption>

				<thead>
					<tr className={styles.comparativeTable__mobileHeadRow}>
						<th scope="col" className={styles.comparativeTable__mobileHeadCell}>
							<FootnoteText>{leftColumnLabel}</FootnoteText>
						</th>

						<th scope="col" className={styles.comparativeTable__mobileHeadCell}>
							<FootnoteText>{rightColumnLabel}</FootnoteText>
						</th>
					</tr>
				</thead>

				<tbody>
					{rows.map((row) => (
						<React.Fragment key={row.id}>
							<tr key={`${row.label}-label`} className={styles.comparativeTable__mobileLabelRow}>
								<th colSpan={2} scope="row" className={styles.comparativeTable__mobileLabelCell}>
									<FootnoteText>{row.label}</FootnoteText>
								</th>
							</tr>

							<tr key={`${row.label}-values`} className={styles.comparativeTable__mobileValueRow}>
								<td
									className={`${styles.comparativeTable__mobileValueCell} ${styles.comparativeTable__mobileValueCellLeft}`}
								>
									{row.leftValue.icon && Object.hasOwn(ICONS, row.leftValue.icon) && (
										<span className={styles.comparativeTable__valueIcon}>
											{React.createElement(ICONS[row.leftValue.icon])}
										</span>
									)}
									<FootnoteText>{row.leftValue.label}</FootnoteText>
								</td>

								<td className={styles.comparativeTable__mobileValueCell}>
									{row.rightValue.icon && Object.hasOwn(ICONS, row.rightValue.icon) && (
										<span className={styles.comparativeTable__valueIcon}>
											{React.createElement(ICONS[row.rightValue.icon])}
										</span>
									)}
									<FootnoteText>{row.rightValue.label}</FootnoteText>
								</td>
							</tr>
						</React.Fragment>
					))}
				</tbody>
			</table>

			<div className={styles.comparativeTable__actions}>
				{leftColumnButton && (
					<Cta {...leftColumnButton} className={styles.comparativeTable__button} />
				)}

				{rightColumnButton && (
					<Cta {...rightColumnButton} className={styles.comparativeTable__button} />
				)}
			</div>

			{/* DESKTOP */}

			<table className={styles.comparativeTable__desktopTable}>
				<colgroup>
					<col className={styles.comparativeTable__desktopColumnLabel} />
					<col className={styles.comparativeTable__desktopColumnValue} />
					<col className={styles.comparativeTable__desktopColumnValue} />
				</colgroup>
				<caption className={styles.comparativeTable__srOnly}>
					<FootnoteText>{title}</FootnoteText>
				</caption>

				<thead>
					<tr>
						<th
							scope="col"
							className={`${styles.comparativeTable__desktopHeadCell} ${styles.comparativeTable__desktopHeadCellEmpty}`}
						>
							<FootnoteText>{rowHeaderLabel}</FootnoteText>
						</th>

						<th scope="col" className={styles.comparativeTable__desktopHeadCell}>
							<FootnoteText>{leftColumnLabel}</FootnoteText>
						</th>

						<th scope="col" className={styles.comparativeTable__desktopHeadCell}>
							<FootnoteText>{rightColumnLabel}</FootnoteText>
						</th>
					</tr>
				</thead>

				<tbody>
					{rows.map((row) => (
						<tr key={row.label}>
							<th scope="row" className={styles.comparativeTable__desktopLabelCell}>
								<FootnoteText>{row.label}</FootnoteText>
							</th>

							<td
								className={`${styles.comparativeTable__desktopValueCell} ${styles.comparativeTable__desktopValueCellLeft}`}
							>
								{row.leftValue.icon && Object.hasOwn(ICONS, row.leftValue.icon) && (
									<span className={styles.comparativeTable__valueIcon}>
										{React.createElement(ICONS[row.leftValue.icon])}
									</span>
								)}
								<FootnoteText>{row.leftValue.label}</FootnoteText>
							</td>

							<td className={styles.comparativeTable__desktopValueCell}>
								{row.rightValue.icon && Object.hasOwn(ICONS, row.rightValue.icon) && (
									<span className={styles.comparativeTable__valueIcon}>
										{React.createElement(ICONS[row.rightValue.icon])}
									</span>
								)}
								<FootnoteText>{row.rightValue.label}</FootnoteText>
							</td>
						</tr>
					))}

					<tr>
						<th aria-hidden="true" className={styles.comparativeTable__desktopLabelCell} />

						<td className={styles.comparativeTable__desktopCtaCell}>
							{leftColumnButton && (
								<Cta {...leftColumnButton} className={styles.comparativeTable__desktopButton} />
							)}
						</td>

						<td className={styles.comparativeTable__desktopCtaCell}>
							{rightColumnButton && (
								<Cta {...rightColumnButton} className={styles.comparativeTable__desktopButton} />
							)}
						</td>
					</tr>
				</tbody>
			</table>
		</section>
	);
}
