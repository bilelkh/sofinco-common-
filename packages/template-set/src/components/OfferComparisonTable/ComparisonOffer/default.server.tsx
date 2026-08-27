import { jahiaComponent, RenderChild } from "@jahia/javascript-modules-library";
import { mapComparisonOffer } from "./comparisonOffer.mapping";
import classes from "./comparisonOffer.module.css";

/**
 * Standalone view for a single offer — only rendered in edit mode (inside the
 * parent's `RenderChild`). In live mode the parent maps offers into props and
 * hands them to the hydrated `OfferComparisonTable` Island.
 */
export default jahiaComponent(
	{
		nodeType: "sofnt:comparisonOffer",
		displayName: "Offre du comparatif",
		componentType: "view",
	},
	(_, { currentNode }) => {
		const offer = mapComparisonOffer(currentNode);
		return (
			<section
				className={classes.editOffer}
				style={{ backgroundColor: offer.backgroundColor || "#9FF0EA" }}
			>
				<div className={classes.editOfferHeader}>
					<span className={classes.editOfferLabel}>{offer.label}</span>
				</div>

				<div className={classes.editOfferGrid}>
					<div className={classes.editOfferColumn}>
						<div className={classes.editOfferFeatures}>
							<p className={classes.editColumnTitle}>Arguments — colonne gauche</p>
							<RenderChild name="leftFeatures" />
						</div>
					</div>

					<div className={classes.editOfferMedia}>
						{offer.image && (
							<img
								src={offer.image.src}
								alt={offer.image.alt}
								className={classes.editOfferImage}
								loading="lazy"
							/>
						)}
					</div>

					<div className={classes.editOfferColumn}>
						<div className={classes.editOfferFeatures}>
							<p className={classes.editColumnTitle}>Arguments — colonne droite</p>
							<RenderChild name="rightFeatures" />
						</div>
					</div>
				</div>

				<div className={classes.editOfferCtaWrapper}>
					<span className={classes.editOfferCta}>{offer.cta.label}</span>
				</div>
			</section>
		);
	},
);
