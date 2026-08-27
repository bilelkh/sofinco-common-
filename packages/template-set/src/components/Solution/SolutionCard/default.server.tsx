import { jahiaComponent } from "@jahia/javascript-modules-library";
import { readSolutionCard } from "./solutionCard.mapping";
import classes from "./solutionCard.module.css";

/**
 * Vue edit-mode d'une carte dans le contexte COMPLEMENTARY (`sofnt:solution`).
 *
 * Contrairement au contexte slider, on ne peut pas reutiliser le composant DS :
 * <SolutionComplementary> est le composant de SECTION complete (titre + tableau
 * de cartes + etats d'expansion/hover). Il n'existe pas de sous-composant carte
 * isole et exporte, comme c'est le cas pour <SolutionCard> cote slider.
 *
 * On reconstruit donc ici un apercu statique fidele a l'esprit du rendu live :
 * image de fond, panneau overlay translucide, titre/sous-titre, pills de
 * features et libelle du CTA. Pas de pixel-perfect, mais suffisant pour que le
 * contributeur reconnaisse et edite sa carte.
 *
 * Evolution possible (autre ticket, cote DS) : extraire un
 * <SolutionComplementaryCard> presentationnel et l'exporter, pour obtenir la
 * meme symetrie que le slider et supprimer cette reconstruction.
 */
export default jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:solutionCard",
		displayName: "Carte solution",
	},
	(_, { currentNode, renderContext }) => {
		if (!renderContext.isEditMode()) return null;

		const { title, subtitle, features, ctaLabel, imageUrl, imageUrlMobile, imageAlt } =
			readSolutionCard(currentNode);

		return (
			<article className={classes.card}>
				{imageUrl ? (
					// Meme bascule que le live (<SolutionComplementary> emet un <source>
					// a 600px) : le contributeur voit le visuel reellement servi a cette
					// largeur, au lieu du seul crop desktop.
					<picture className={classes.cardBgPicture}>
						{imageUrlMobile && <source media="(max-width: 600px)" srcSet={imageUrlMobile} />}
						<img src={imageUrl} alt={imageAlt} className={classes.cardBg} loading="lazy" />
					</picture>
				) : (
					<div className={classes.cardBgPlaceholder} aria-hidden="true">
						Image manquante
					</div>
				)}

				<div className={classes.panel}>
					<p className={classes.cardTitle}>{title}</p>
					{subtitle && <p className={classes.cardSubtitle}>{subtitle}</p>}

					{features.length > 0 && (
						<ul className={classes.chips}>
							{features.map((feature) => (
								<li key={feature} className={classes.chip}>
									<span className={classes.chipCheck} aria-hidden="true">
										&#10003;
									</span>
									{feature}
								</li>
							))}
						</ul>
					)}

					{ctaLabel && <span className={classes.cta}>{ctaLabel}</span>}
				</div>
			</article>
		);
	},
);
