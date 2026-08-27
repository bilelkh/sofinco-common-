import Star from "@shared/ui/svg/star";
import classes from "./starRating.module.css";
import clsx from "clsx";

interface StarRatingProps {
	"ratingScore": number;
	"maxStars"?: number;
	"theme"?: "light" | "dark" | "inherit";
	/** Fill the remaining track up to `maxStars` with outlined (empty) stars. */
	"showEmpty"?: boolean;
	/** Extra class merged onto the root — lets consumers size/space the track. */
	"className"?: string;
	"aria-label"?: string;
}

type StarKind = "full" | "half" | "empty";

function StarSpan({ kind }: { kind: StarKind }) {
	return (
		<span className={clsx(classes["star-rating__star"], classes[`star-rating__star--${kind}`])}>
			<Star />
		</span>
	);
}

/**
 * Renders star rating using SVG stars.
 * Supports full stars and half stars based on rating score.
 * @param ratingScore - The rating score (0-`maxStars`); out-of-range values are clamped.
 * @param maxStars - Maximum number of stars (default: 5)
 * @param theme - Visual theme (light, dark) or `inherit` to follow `currentColor`
 * @param showEmpty - Render the remaining stars as empty outlines (default: false)
 */
export function StarRating({
	ratingScore,
	maxStars = 5,
	theme = "dark",
	showEmpty = false,
	className,
	"aria-label": ariaLabel,
}: StarRatingProps) {
	const totalStars = Math.max(1, Math.trunc(maxStars));
	const clamped = Math.max(0, Math.min(totalStars, ratingScore));
	if (clamped !== ratingScore) {
		// Dev diagnostic only; the component must stay pure for SSR, so there is no
		// effect/handler to move this into — clamping already keeps render safe.
		console.warn(`[StarRating] ratingScore ${ratingScore} clamped to ${clamped}`);
	}

	const fullStars = Math.floor(clamped);
	const decimalPart = clamped - fullStars;
	const hasHalfStar = decimalPart >= 0.2 && decimalPart < 0.7;
	const roundsUp = decimalPart >= 0.7;

	// Position is each star's identity, so a sequential id is a stable, non-index key.
	const stars: { kind: StarKind; key: string }[] = [];
	const push = (kind: StarKind) => stars.push({ kind, key: `star-${stars.length}` });
	for (let i = 0; i < fullStars; i++) push("full");
	if (hasHalfStar) push("half");
	else if (roundsUp) push("full");
	if (showEmpty) while (stars.length < totalStars) push("empty");

	const label = ariaLabel ?? `Note de ${clamped} sur ${totalStars}`;

	return (
		<span
			className={clsx(classes["star-rating"], className)}
			data-rating={clamped}
			data-theme={theme}
			role="img"
			aria-label={label}
		>
			{stars.map(({ kind, key }) => (
				<StarSpan key={key} kind={kind} />
			))}
		</span>
	);
}
