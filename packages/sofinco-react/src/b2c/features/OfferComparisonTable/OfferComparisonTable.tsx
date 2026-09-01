"use client";

import { useId, useRef, useState, type CSSProperties } from "react";
import clsx from "clsx";

import SectionHeading from "@shared/ui/SectionHeading";
import Cta from "@shared/ui/Cta";
import { Tag } from "@shared/ui/Tag";
import Image from "@shared/ui/Image";
import { useHeaderHeightVar } from "@shared/hooks/useHeaderHeightVar";
import useStuckAttribute from "@shared/hooks/useStuckAttribute";
import type {
	ComparisonOffer,
	ComparisonOfferFeature,
	OfferComparisonTableProps,
} from "./offer-comparison-table.types";
import classes from "./offer-comparison-table.module.css";
import { FootnoteText, footnoteDescribedBy } from "@shared/footnotes";

/**
 * Feature slot of an offer at a given row index: left-column features first,
 * then right-column ones. Rows are shared across offers, so an offer with
 * fewer features yields empty (hidden) cells past its last slot.
 */
function featureAt(
	offer: ComparisonOffer,
	rowIndex: number,
): { feature: ComparisonOfferFeature; side: "left" | "right" } | null {
	if (rowIndex < offer.leftFeatures.length) {
		return { feature: offer.leftFeatures[rowIndex], side: "left" };
	}
	const rightIndex = rowIndex - offer.leftFeatures.length;
	if (rightIndex < offer.rightFeatures.length) {
		return { feature: offer.rightFeatures[rightIndex], side: "right" };
	}
	return null;
}

/**
 * SEO/LLMEO-friendly offer comparison section.
 *
 * The comparison is a real `<table>`: one column per offer (th = offer name,
 * cells = image + features), so crawlers and LLMs read the full comparison of
 * every offer from the initial HTML. Only the active offer's column is
 * displayed; the others are CSS-hidden, and the header buttons toggle which
 * column shows (`aria-pressed`). Explicit table ARIA roles are set because
 * the CSS display overrides (grid/flex/contents) used to reproduce the card
 * layout can strip the implicit ones from the accessibility tree.
 */
export function OfferComparisonTable({ title, offers, className }: OfferComparisonTableProps) {
	const baseId = useId();
	const [activeIndex, setActiveIndex] = useState(0);
	const headRef = useRef<HTMLTableSectionElement>(null);

	useHeaderHeightVar();
	useStuckAttribute(headRef);

	if (offers.length === 0) return null;

	// Clamp once so a stale `activeIndex` (e.g. after `offers` shrinks) can never
	// point past the end — every cell/button/offset comparison uses `safeIndex`.
	const safeIndex = Math.min(activeIndex, offers.length - 1);
	const activeOffer = offers[safeIndex];
	const rowCount = Math.max(...offers.map((o) => o.leftFeatures.length + o.rightFeatures.length));
	const rowIndexes = Array.from({ length: rowCount }, (_, i) => i);

	const cellClass = (offerIndex: number, ...extra: (string | false | null | undefined)[]) =>
		clsx(
			classes["offer-comparison-table__cell"],
			...extra,
			offerIndex !== safeIndex && classes["offer-comparison-table__cell--hidden"],
		);

	// Side a non-active offer rests toward, so it slides in/out from the
	// direction of travel instead of popping in place (see the CSS transition
	// on `.offer-comparison-table__cell`).
	const restOffset = (offerIndex: number): -1 | 0 | 1 =>
		offerIndex < safeIndex ? -1 : offerIndex > safeIndex ? 1 : 0;

	const cellStyle = (offerIndex: number, extra?: CSSProperties): CSSProperties =>
		({
			...extra,
			"--offer-comparison-table-offset": restOffset(offerIndex),
		}) as CSSProperties;

	const switchOffer = (index: number) => {
		if (index === safeIndex) return;
		if (typeof document.startViewTransition === "function") {
			document.startViewTransition(() => {
				setActiveIndex(index);
			});
		} else {
			setActiveIndex(index);
		}
	};

	return (
		<section
			className={clsx(classes["offer-comparison-table"], className)}
			aria-labelledby={`${baseId}-title`}
			style={{ "--offer-comparison-table-bg": activeOffer.backgroundColor } as CSSProperties}
		>
			<div className={classes["offer-comparison-table__container"]}>
				<SectionHeading titleAs="h2" id={`${baseId}-title`} title={title} align="center" />

				<table className={classes["offer-comparison-table__table"]}>
					<caption className={classes["sr-only"]}>
						<FootnoteText>{title}</FootnoteText>
					</caption>

					<thead ref={headRef} className={classes["offer-comparison-table__head"]}>
						<tr className={classes["offer-comparison-table__head-row"]}>
							{offers.map((offer, index) => (
								<th
									key={offer.id}
									scope="col"
									className={classes["offer-comparison-table__offer-header"]}
								>
									<button
										type="button"
										aria-pressed={index === safeIndex}
										className={clsx(
											classes["offer-comparison-table__offer-button"],
											index === safeIndex &&
												classes["offer-comparison-table__offer-button--active"],
										)}
										onClick={() => switchOffer(index)}
										aria-describedby={footnoteDescribedBy(offer.label)}
									>
										<FootnoteText inert>{offer.label}</FootnoteText>
									</button>
								</th>
							))}
						</tr>
					</thead>

					{/* Stays mounted across offer switches (no `key`) so the cells' own
                        CSS transition can animate between the active/hidden states
                        instead of popping via a full remount. */}
					<tbody className={classes["offer-comparison-table__body"]}>
						<tr className={classes["offer-comparison-table__row"]}>
							{offers.map((offer, index) => (
								<td
									key={offer.id}
									className={cellClass(index, classes["offer-comparison-table__cell--image"])}
									style={cellStyle(index, {
										"--offer-comparison-table-rows": Math.max(
											offer.leftFeatures.length,
											offer.rightFeatures.length,
										),
									} as CSSProperties)}
								>
									<Image
										className={classes["offer-comparison-table__image"]}
										src={offer.image.src}
										alt={offer.image.alt ?? ""}
										width={444}
										height={298}
									/>
								</td>
							))}
						</tr>

						{rowIndexes.map((rowIndex) => (
							<tr key={rowIndex} className={classes["offer-comparison-table__row"]}>
								{offers.map((offer, index) => {
									const slot = featureAt(offer, rowIndex);
									return (
										<td
											key={offer.id}
											className={cellClass(
												index,
												slot && classes[`offer-comparison-table__cell--${slot.side}`],
												!slot && classes["offer-comparison-table__cell--hidden"],
											)}
											style={cellStyle(index)}
										>
											{slot && (
												<>
													<Tag className={classes["offer-comparison-table__feature-label"]}>
														{slot.feature.label}
													</Tag>
													<p className={classes["offer-comparison-table__feature-text"]}>
														<FootnoteText>{slot.feature.text}</FootnoteText>
													</p>
												</>
											)}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>

				<div className={classes["offer-comparison-table__cta"]}>
					<Cta {...activeOffer.cta} />
				</div>
			</div>
		</section>
	);
}
