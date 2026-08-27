import { Island } from "@jahia/javascript-modules-library";
import classes from "./mentionLegalItem.module.css";
import CopyAnchorButton from "./CopyAnchorButton.client";

interface Props {
	anchorSlug: string;
	content: string;
}

/**
 * Flèche « libellé → valeur », tracé Lucide `arrow-right`.
 *
 * SVG en ligne et non un paquet d'icônes : `template-set` n'embarque pas `lucide-react`, et
 * `CopyAnchorButton` pose déjà la même convention (tracés Lucide recopiés, `currentColor`,
 * `stroke-width` 2). Le glyphe texte `→` qu'elle remplace était lu à voix haute par les
 * lecteurs d'écran — « flèche vers la droite » — au milieu d'un libellé où il n'apporte rien.
 */
function ArrowRightIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M5 12h14" />
			<path d="m12 5 7 7-7 7" />
		</svg>
	);
}

export function MentionLegalItemServer({ anchorSlug, content }: Props) {
	return (
		<div className={classes.mentionLegalItem}>
			<div className={classes.mentionLegalItem__meta}>
				{anchorSlug ? (
					<>
						<span className={classes.mentionLegalItem__label}>Ancre</span>
						<span className={classes.mentionLegalItem__arrow}>
							<ArrowRightIcon />
						</span>
						<code className={classes.mentionLegalItem__anchor}>{anchorSlug}</code>
						<Island component={CopyAnchorButton} props={{ value: `${anchorSlug}` }} />
					</>
				) : (
					/*
					 * Sans ce libellé, l'absence d'ancre se lit comme un oubli : la ligne « Ancre →
					 * … » disparaît sans rien laisser, et le contributeur ne peut pas distinguer un
					 * texte libre voulu d'un champ qu'il a omis de remplir. On nomme donc le cas.
					 */
					<span className={classes.mentionLegalItem__free}>Texte sans renvoi</span>
				)}
			</div>
			{content && (
				<div
					className={classes.mentionLegalItem__content}
					// Rich-text HTML géré dans Jahia — injection volontaire
					// eslint-disable-next-line @eslint-react/dom/no-dangerously-set-innerhtml
					dangerouslySetInnerHTML={{ __html: content }}
				/>
			)}
		</div>
	);
}
