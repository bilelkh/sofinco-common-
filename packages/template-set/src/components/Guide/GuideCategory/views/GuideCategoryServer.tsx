import { RenderChildren } from "@jahia/javascript-modules-library";
import type { GuideCategoryPropsServer } from "../guideCategory.mapping";
import classes from "./guideCategory.module.css";

/**
 * Vue edit-mode d'une categorie de guide.
 */
export function GuideCategoryServer({
	title,
	imageUrl,
	imageUrlMobile,
	imageAlt,
}: GuideCategoryPropsServer) {
	return (
		<article className={classes["guide-category"]}>
			{imageUrl && (
				<div className={classes["guide-category__image-wrapper"]}>
					{/* Meme bascule que la tuile d'apercu (voir le @media 768px du CSS) : le
					    contributeur voit le visuel qui sera reellement servi a cette largeur. */}
					<picture className={classes["guide-category__picture"]}>
						{imageUrlMobile && <source media="(max-width: 767.98px)" srcSet={imageUrlMobile} />}
						<img
							src={imageUrl}
							alt={imageAlt}
							className={classes["guide-category__image"]}
							loading="lazy"
						/>
					</picture>
				</div>
			)}
			<div className={classes["guide-category__content"]}>
				<span className={classes["guide-category__eyebrow"]}>{title}</span>
				<div className={classes["guide-category__link-list"]}>
					<RenderChildren nodeTypes={["sofnt:link"]} />
				</div>
			</div>
		</article>
	);
}
