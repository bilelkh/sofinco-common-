import { jahiaComponent, RenderChild } from "@jahia/javascript-modules-library";
import { mapComparatorCard } from "./comparatorCard.mapping";
import classes from "./comparatorCard.module.css";

/**
 * Standalone view for a single card — only rendered in edit mode (inside the
 * parent's `RenderChild`). It exposes the features as editable children; in
 * live mode the parent maps cards into props and hands them to the hydrated
 * `CardComparatorTable` Island.
 */
export default jahiaComponent(
	{
		nodeType: "sofnt:comparatorCard",
		displayName: "Carte du comparateur",
		componentType: "view",
	},
	(_, { currentNode }) => {
		const card = mapComparatorCard(currentNode);
		return (
			<article className={classes.editCard}>
				{card.badgeLabel && <span className={classes.editBadge}>{card.badgeLabel}</span>}
				{card.image && <img src={card.image} alt="" className={classes.editImage} />}
				<p className={classes.editTitle}>{card.title}</p>
				<p className={classes.editDescription}>{card.description}</p>
				<div className={classes.editFeatures}>
					<RenderChild name="features" />
				</div>
				<span className={classes.editCta}>CTA : {card.cta.label}</span>
			</article>
		);
	},
);
