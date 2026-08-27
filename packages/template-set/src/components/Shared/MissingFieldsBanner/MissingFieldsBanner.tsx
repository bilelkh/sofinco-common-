import classes from "./missingFieldsBanner.module.css";

/**
 * One field of the "missing required fields" banner : contributor-facing label
 * (matches the Content Editor form field name) + short instruction telling
 * where to fill it.
 */
export interface MissingField {
	/** Label of the CE form field (aligned with `sofinco-template.properties`). */
	label: string;
	/** Short instruction — starts with a verb, e.g. « renseignez le champ … ». */
	description: string;
}

interface Props {
	/**
	 * Human-readable block name, prefixed in the banner title (indispensable
	 * when several previews are stacked — e.g. inside `ArrayFocusWrapper`).
	 * Aligned with the `sofinco-template.properties` block label.
	 */
	blockName: string;
	/** Missing fields to list. Renders nothing when the array is empty. */
	fields: MissingField[];
}

/**
 * Shared edit-mode banner listing empty mandatory fields of a block. Rendered
 * by dedicated preview views (`SeoBlockServer`, `InsuranceFocusServer`, …) on
 * top of the live DS render, so the contributor sees both the current state
 * and an actionable checklist of what's left to fill.
 *
 * The banner has `role="status"` — announced politely to assistive tech
 * without interrupting.
 */
export default function MissingFieldsBanner({ blockName, fields }: Props) {
	if (fields.length === 0) return null;

	return (
		<div className={classes.missingBanner} role="status">
			<span className={classes.missingBannerIcon} aria-hidden="true">
				⚠️
			</span>
			<div>
				<strong>{blockName} — Champs obligatoires manquants</strong>
				<ul className={classes.missingList}>
					{fields.map((field) => (
						<li key={field.label}>
							<strong>{field.label}</strong> — {field.description}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
