import { Island, jahiaComponent } from "@jahia/javascript-modules-library";

import type { AvisItem } from "sofinco-react";
import AvisClientJahia from "./AvisClientJahia.client";
import classes from "./component.module.css";
import { getChildNode, imgUrl, num, str } from "#lib/jcr";
import { readAverageRating, readReviews, type Review } from "#lib/reviews";
import { verifiedReviewConfigRelPath } from "#lib/siteConfigs";

const DEFAULT_MAX_REVIEWS = 10;
const TONES = ["lilac", "peach", "pink", "yellow"] as const;

/**
 * La rotation des teintes est un choix d'affichage : elle reste au plus près du rendu,
 * là où la palette a un sens. Le type de retour `AvisItem[]` sert de garde-fou — si
 * `Review` cesse de satisfaire `AvisItem`, la compilation casse ici et non au runtime.
 */
const withTone = (reviews: Review[]): AvisItem[] =>
	reviews.map((review, index) => ({ ...review, tone: TONES[index % TONES.length] }));

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:avisClient",
		displayName: "Avis Client",
		// Pas de `cache.mainResource` : ce drapeau ajoute la page courante à la clé de cache, donc
		// duplique le fragment par page au lieu de le partager. Le rendu ne dépend que des
		// propriétés du nœud, du nœud de config au niveau site et du mode d'édition — rien qui
		// varie d'une page à l'autre.
		properties: {
			"cache.expiration": "3600",
		},
	},
	(_, { renderContext, currentNode }) => {
		const title = str(currentNode, "title");
		const subtitle = str(currentNode, "subtitle");
		const linkLabel = str(currentNode, "linkLabel");
		const linkHref = str(currentNode, "linkHref");
		const productId = str(currentNode, "productId");
		const minNote = num(currentNode, "minNote", 0);
		const verifiedLogo = imgUrl(currentNode, "verifiedLogo");

		// `settingsNode` peut être absent (script `avis-verifie.groovy` non joué) : les deux
		// lectures l'acceptent et renvoient vide. Le nœud reste nécessaire pour que l'aperçu
		// edit-mode distingue « config introuvable » de « aucun avis remonté ».
		const settingsNode = getChildNode(renderContext.getSite(), verifiedReviewConfigRelPath);

		const items = withTone(
			readReviews(settingsNode, { limit: DEFAULT_MAX_REVIEWS, productId, minNote }),
		);
		const average = readAverageRating(settingsNode);

		if (renderContext.isEditMode()) {
			return (
				<div className={classes.editPreview}>
					<h2 className={classes.editTitle}>{title}</h2>
					{subtitle && <p className={classes.editSubtitle}>{subtitle}</p>}
					{linkLabel && (
						<p className={classes.editSubtitle}>
							Lien : {linkLabel} → {linkHref || "(non défini)"}
						</p>
					)}
					<p className={classes.editNote}>
						Produit : {productId || "(tous)"} · Note minimale : {minNote}
					</p>
					<p className={classes.editNote}>
						{settingsNode
							? `${items.length} avis chargés via ReviewServiceBridge.`
							: `⚠ Config introuvable à 'contents/config/avis-verifies/config' — lance le script avis-verifie.groovy.`}
					</p>
				</div>
			);
		}

		return (
			<Island
				component={AvisClientJahia}
				props={{
					title,
					subtitle,
					linkLabel,
					linkHref,
					items,
					verifiedLogoUrl: verifiedLogo || undefined,
					ratingScore: average?.ratingValue,
					ratingReviewsCount: average?.reviewCount,
				}}
			/>
		);
	},
);
